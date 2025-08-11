import type { Peer } from '$lib/types/peer';

/**
 * Utility functions for peer configuration management
 */

export interface PeerConfigSummary {
	totalPeers: number;
	activeGroups: string[];
	peersByGroup: Record<string, string[]>;
	unassignedPeers: string[];
	groupCoverage: number; // Percentage of peers in custom groups
}

/**
 * Analyzes peer configuration and provides summary statistics
 */
export function analyzePeerConfig(peers: Peer[]): PeerConfigSummary {
	const totalPeers = peers.length;
	const groupSet = new Set<string>();
	const peersByGroup: Record<string, string[]> = {};
	const unassignedPeers: string[] = [];

	// Analyze each peer
	peers.forEach((peer) => {
		let hasCustomGroups = false;

		peer.groups.forEach((group) => {
			groupSet.add(group);

			if (!peersByGroup[group]) {
				peersByGroup[group] = [];
			}
			peersByGroup[group].push(peer.alias);

			if (group !== 'all') {
				hasCustomGroups = true;
			}
		});

		// Track peers with only 'all' group
		if (!hasCustomGroups) {
			unassignedPeers.push(peer.alias);
		}
	});

	const activeGroups = Array.from(groupSet).sort();
	const peersInCustomGroups = totalPeers - unassignedPeers.length;
	const groupCoverage = totalPeers > 0 ? (peersInCustomGroups / totalPeers) * 100 : 0;

	return {
		totalPeers,
		activeGroups,
		peersByGroup,
		unassignedPeers,
		groupCoverage
	};
}

/**
 * Validates peer alias format
 */
export function validatePeerAlias(alias: string): { isValid: boolean; error?: string } {
	if (!alias.trim()) {
		return { isValid: false, error: 'Alias cannot be empty' };
	}

	if (alias.length < 2) {
		return { isValid: false, error: 'Alias must be at least 2 characters long' };
	}

	if (alias.length > 50) {
		return { isValid: false, error: 'Alias cannot be longer than 50 characters' };
	}

	if (alias.includes('-')) {
		return { isValid: false, error: 'Alias cannot contain hyphens' };
	}

	if (!/^[a-zA-Z0-9_]+$/.test(alias)) {
		return { isValid: false, error: 'Alias can only contain letters, numbers, and underscores' };
	}

	if (/^\d/.test(alias)) {
		return { isValid: false, error: 'Alias cannot start with a number' };
	}

	// Reserved names
	const reserved = ['all', 'admin', 'root', 'system', 'config', 'api', 'www'];
	if (reserved.includes(alias.toLowerCase())) {
		return { isValid: false, error: `"${alias}" is a reserved name` };
	}

	return { isValid: true };
}

/**
 * Validates public key format
 */
export function validatePublicKey(publicKey: string): { isValid: boolean; error?: string } {
	if (!publicKey.trim()) {
		return { isValid: false, error: 'Public key cannot be empty' };
	}

	if (publicKey.length !== 64) {
		return { isValid: false, error: 'Public key must be exactly 64 characters long' };
	}

	if (!/^[a-f0-9]+$/.test(publicKey)) {
		return {
			isValid: false,
			error: 'Public key must contain only lowercase hexadecimal characters (a-f, 0-9)'
		};
	}

	return { isValid: true };
}

/**
 * Checks if a peer alias is unique in the current peer list
 */
export function isPeerAliasUnique(alias: string, peers: Peer[], excludeAlias?: string): boolean {
	return !peers.some(
		(peer) => peer.alias.toLowerCase() === alias.toLowerCase() && peer.alias !== excludeAlias
	);
}

/**
 * Checks if a public key is unique in the current peer list
 */
export function isPublicKeyUnique(
	publicKey: string,
	peers: Peer[],
	excludePublicKey?: string
): boolean {
	return !peers.some((peer) => peer.publicKey === publicKey && peer.publicKey !== excludePublicKey);
}

/**
 * Generates suggestions for peer aliases based on patterns
 */
export function generatePeerAliasSuggestions(base: string = ''): string[] {
	const suggestions: string[] = [];
	const cleanBase = base.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

	if (cleanBase) {
		// Variations of the base
		suggestions.push(cleanBase);
		suggestions.push(`${cleanBase}_dev`);
		suggestions.push(`${cleanBase}_prod`);
		suggestions.push(`${cleanBase}_01`);
	}

	// Common patterns
	const commonPrefixes = ['dev', 'prod', 'test', 'staging', 'user', 'team'];
	const commonSuffixes = ['01', '02', 'dev', 'prod', 'main'];

	commonPrefixes.forEach((prefix) => {
		if (cleanBase && !cleanBase.startsWith(prefix)) {
			suggestions.push(`${prefix}_${cleanBase}`);
		}
	});

	return suggestions.slice(0, 5); // Limit to 5 suggestions
}

/**
 * Formats peer information for display
 */
export function formatPeerInfo(peer: Peer): {
	alias: string;
	publicKeyShort: string;
	publicKeyFormatted: string;
	groupList: string;
	activitySummary: string;
} {
	return {
		alias: peer.alias,
		publicKeyShort: `${peer.publicKey.slice(0, 8)}...${peer.publicKey.slice(-8)}`,
		publicKeyFormatted: peer.publicKey.match(/.{1,8}/g)?.join(' ') || peer.publicKey,
		groupList: peer.groups.join(', '),
		activitySummary: `${peer.incomingCount} received, ${peer.outgoingCount} sent${peer.unreadCount > 0 ? `, ${peer.unreadCount} unread` : ''}`
	};
}

/**
 * Calculates peer network statistics
 */
export function calculatePeerNetworkStats(peers: Peer[]): {
	totalMessages: number;
	totalUnread: number;
	mostActiveReceiver: Peer | null;
	mostActiveSender: Peer | null;
	averageMessagesPerPeer: number;
} {
	if (peers.length === 0) {
		return {
			totalMessages: 0,
			totalUnread: 0,
			mostActiveReceiver: null,
			mostActiveSender: null,
			averageMessagesPerPeer: 0
		};
	}

	const totalMessages = peers.reduce(
		(sum, peer) => sum + peer.incomingCount + peer.outgoingCount,
		0
	);
	const totalUnread = peers.reduce((sum, peer) => sum + peer.unreadCount, 0);

	const mostActiveReceiver = peers.reduce(
		(max, peer) => (peer.incomingCount > (max?.incomingCount || 0) ? peer : max),
		null as Peer | null
	);

	const mostActiveSender = peers.reduce(
		(max, peer) => (peer.outgoingCount > (max?.outgoingCount || 0) ? peer : max),
		null as Peer | null
	);

	const averageMessagesPerPeer = totalMessages / peers.length;

	return {
		totalMessages,
		totalUnread,
		mostActiveReceiver,
		mostActiveSender,
		averageMessagesPerPeer
	};
}

/**
 * Sorts peers by various criteria
 */
export function sortPeers(
	peers: Peer[],
	criteria: 'alias' | 'activity' | 'unread' | 'groups'
): Peer[] {
	return [...peers].sort((a, b) => {
		switch (criteria) {
			case 'alias':
				return a.alias.localeCompare(b.alias);

			case 'activity':
				const aTotal = a.incomingCount + a.outgoingCount;
				const bTotal = b.incomingCount + b.outgoingCount;
				return bTotal - aTotal; // Descending

			case 'unread':
				if (b.unreadCount !== a.unreadCount) {
					return b.unreadCount - a.unreadCount; // Descending
				}
				return a.alias.localeCompare(b.alias); // Secondary sort by alias

			case 'groups':
				if (a.groups.length !== b.groups.length) {
					return b.groups.length - a.groups.length; // Descending
				}
				return a.alias.localeCompare(b.alias); // Secondary sort by alias

			default:
				return 0;
		}
	});
}

/**
 * Filters peers based on various criteria
 */
export function filterPeers(
	peers: Peer[],
	filters: {
		search?: string;
		hasUnread?: boolean;
		minActivity?: number;
		groupName?: string;
	}
): Peer[] {
	return peers.filter((peer) => {
		// Search filter
		if (filters.search) {
			const searchLower = filters.search.toLowerCase();
			if (
				!peer.alias.toLowerCase().includes(searchLower) &&
				!peer.publicKey.toLowerCase().includes(searchLower)
			) {
				return false;
			}
		}

		// Unread filter
		if (filters.hasUnread !== undefined) {
			if (filters.hasUnread && peer.unreadCount === 0) return false;
			if (!filters.hasUnread && peer.unreadCount > 0) return false;
		}

		// Activity filter
		if (filters.minActivity !== undefined) {
			const totalActivity = peer.incomingCount + peer.outgoingCount;
			if (totalActivity < filters.minActivity) return false;
		}

		// Group filter
		if (filters.groupName) {
			if (!peer.groups.includes(filters.groupName)) return false;
		}

		return true;
	});
}
