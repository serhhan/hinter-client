import fs from 'fs/promises';
import path from 'path';

// Types
export interface Peer {
	alias: string;
	publicKey: string;
	incomingCount: number;
	outgoingCount: number;
	unreadCount: number;
}

export interface Report {
	filename: string;
	content: string;
	timestamp: Date;
	size: number;
	isRead?: boolean;
}

export interface Entry {
	filename: string;
	content: string;
	timestamp: Date;
	size: number;
	isPinned: boolean;
}

export interface ReadStatus {
	[key: string]: boolean;
}

// Paths - relative to project root
const DATA_DIR = path.join(process.cwd(), 'data');
const PEERS_DIR = path.join(DATA_DIR, 'peers');
const ENTRIES_DIR = path.join(DATA_DIR, 'entries');
const READ_STATUS_FILE = path.join(DATA_DIR, 'read_status.json');

// Utility function to ensure directory exists
export async function ensureDir(dirPath: string): Promise<void> {
	try {
		await fs.access(dirPath);
	} catch {
		await fs.mkdir(dirPath, { recursive: true });
	}
}

// Helper functions for centralized read status
export async function getReadStatus(): Promise<ReadStatus> {
	try {
		const exists = await fs
			.access(READ_STATUS_FILE)
			.then(() => true)
			.catch(() => false);

		if (exists) {
			const content = await fs.readFile(READ_STATUS_FILE, 'utf8');
			if (!content.trim()) {
				return {};
			}
			return JSON.parse(content);
		}
	} catch (error) {
		console.warn('Error reading read status file:', error);
	}
	return {};
}

export async function saveReadStatus(readStatus: ReadStatus): Promise<void> {
	try {
		await ensureDir(DATA_DIR);
		await fs.writeFile(READ_STATUS_FILE, JSON.stringify(readStatus, null, 2));
	} catch (error) {
		console.error('Error saving read status file:', error);
	}
}

export function getFileKey(alias: string, publicKey: string, filename: string): string {
	return `${alias}-${publicKey}:incoming:${filename}`;
}

// Get all peers
export async function getAllPeers(): Promise<Peer[]> {
	try {
		const peerDirs = await fs.readdir(PEERS_DIR, { withFileTypes: true });
		const peers: Peer[] = [];

		for (const dir of peerDirs) {
			if (dir.isDirectory()) {
				const [alias, ...publicKeyParts] = dir.name.split('-');
				const publicKey = publicKeyParts.join('-');

				const incomingDir = path.join(PEERS_DIR, dir.name, 'incoming');
				const outgoingDir = path.join(PEERS_DIR, dir.name, 'outgoing');

				let incomingCount = 0;
				let outgoingCount = 0;
				let unreadCount = 0;

				try {
					const incomingFiles = await fs.readdir(incomingDir);
					const mdFiles = incomingFiles.filter((f) => f.endsWith('.md'));
					incomingCount = mdFiles.length;

					const readStatus = await getReadStatus();
					unreadCount = mdFiles.filter((file) => {
						const fileKey = getFileKey(alias, publicKey, file);
						return !readStatus[fileKey];
					}).length;
				} catch (error) {
					// Directory doesn't exist or is inaccessible - counts remain 0
					if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
						console.warn(
							`Unexpected error reading incoming directory for ${alias}:`,
							error.message
						);
					}
				}

				try {
					const outgoingFiles = await fs.readdir(outgoingDir);
					outgoingCount = outgoingFiles.filter((f) => f.endsWith('.md')).length;
				} catch (error) {
					// Directory doesn't exist or is inaccessible - count remains 0
					if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
						console.warn(
							`Unexpected error reading outgoing directory for ${alias}:`,
							error.message
						);
					}
				}

				peers.push({
					alias,
					publicKey,
					incomingCount,
					outgoingCount,
					unreadCount
				});
			}
		}

		return peers;
	} catch (error) {
		console.error('Error getting peers:', error);
		return [];
	}
}

// Add new peer
export async function addPeer(alias: string, publicKey: string): Promise<void> {
	if (!alias || !publicKey) {
		throw new Error('Alias and public key are required');
	}

	if (alias.includes('-')) {
		throw new Error('Alias cannot contain hyphens');
	}

	if (!/^[a-f0-9]{64}$/.test(publicKey)) {
		throw new Error('Public key must be 64 lowercase hexadecimal characters');
	}

	const peerDir = path.join(PEERS_DIR, `${alias}-${publicKey}`);
	const incomingDir = path.join(peerDir, 'incoming');
	const outgoingDir = path.join(peerDir, 'outgoing');

	try {
		await fs.access(peerDir);
		throw new Error('Peer already exists');
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
			throw error;
		}
	}

	await ensureDir(incomingDir);
	await ensureDir(outgoingDir);
}

// Remove peer
export async function removePeer(alias: string, publicKey: string): Promise<void> {
	const peerDir = path.join(PEERS_DIR, `${alias}-${publicKey}`);
	await fs.rm(peerDir, { recursive: true, force: true });
}

// Get incoming reports for a peer
export async function getIncomingReports(alias: string, publicKey: string): Promise<Report[]> {
	const incomingDir = path.join(PEERS_DIR, `${alias}-${publicKey}`, 'incoming');

	try {
		const files = await fs.readdir(incomingDir);
		const reports: Report[] = [];
		const readStatus = await getReadStatus();

		for (const file of files) {
			if (file.endsWith('.md')) {
				const filePath = path.join(incomingDir, file);
				const content = await fs.readFile(filePath, 'utf8');
				const stats = await fs.stat(filePath);

				const fileKey = getFileKey(alias, publicKey, file);
				reports.push({
					filename: file,
					content,
					timestamp: stats.mtime,
					size: stats.size,
					isRead: !!readStatus[fileKey]
				});
			}
		}

		reports.sort((a, b) => b.filename.localeCompare(a.filename));
		return reports;
	} catch (error) {
		console.error('Error getting incoming reports:', error);
		return [];
	}
}

// Get outgoing reports for a peer
export async function getOutgoingReports(alias: string, publicKey: string): Promise<Report[]> {
	const outgoingDir = path.join(PEERS_DIR, `${alias}-${publicKey}`, 'outgoing');

	try {
		const files = await fs.readdir(outgoingDir);
		const reports: Report[] = [];

		for (const file of files) {
			if (file.endsWith('.md')) {
				const filePath = path.join(outgoingDir, file);
				const content = await fs.readFile(filePath, 'utf8');
				const stats = await fs.stat(filePath);

				reports.push({
					filename: file,
					content,
					timestamp: stats.mtime,
					size: stats.size
				});
			}
		}

		reports.sort((a, b) => b.filename.localeCompare(a.filename));
		return reports;
	} catch (error) {
		console.error('Error getting outgoing reports:', error);
		return [];
	}
}

// Create outgoing report
export async function createOutgoingReport(
	alias: string,
	publicKey: string,
	content: string,
	suffix: string = ''
): Promise<string> {
	if (!content) {
		throw new Error('Content is required');
	}

	const timestamp = new Date()
		.toISOString()
		.replace(/[-T:.Z]/g, '')
		.slice(0, 14);
	const filename = `${timestamp}${suffix}.md`;
	const outgoingDir = path.join(PEERS_DIR, `${alias}-${publicKey}`, 'outgoing');
	const filePath = path.join(outgoingDir, filename);

	await ensureDir(outgoingDir);
	await fs.writeFile(filePath, content, 'utf8');

	return filename;
}

// Get all entries
export async function getAllEntries(): Promise<Entry[]> {
	try {
		const files = await fs.readdir(ENTRIES_DIR);
		const entries: Entry[] = [];

		for (const file of files) {
			if (file.endsWith('.md')) {
				const filePath = path.join(ENTRIES_DIR, file);
				const content = await fs.readFile(filePath, 'utf8');
				const stats = await fs.stat(filePath);

				entries.push({
					filename: file,
					content,
					timestamp: stats.mtime,
					size: stats.size,
					isPinned: false
				});
			}
		}

		// Get pinned entries
		try {
			const pinnedDir = path.join(ENTRIES_DIR, 'pinned');
			const pinnedFiles = await fs.readdir(pinnedDir);

			for (const file of pinnedFiles) {
				if (file.endsWith('.md')) {
					const filePath = path.join(pinnedDir, file);
					const content = await fs.readFile(filePath, 'utf8');
					const stats = await fs.stat(filePath);

					entries.push({
						filename: file,
						content,
						timestamp: stats.mtime,
						size: stats.size,
						isPinned: true
					});
				}
			}
		} catch (error) {
			// Pinned directory doesn't exist or is inaccessible - skip pinned entries
			if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
				console.warn('Unexpected error reading pinned entries directory:', error.message);
			}
		}

		entries.sort((a, b) => b.filename.localeCompare(a.filename));
		return entries;
	} catch (error) {
		console.error('Error getting entries:', error);
		return [];
	}
}

// Create new entry
export async function createEntry(
	content: string,
	suffix: string = '',
	isPinned: boolean = false
): Promise<string> {
	if (!content) {
		throw new Error('Content is required');
	}

	const timestamp = new Date()
		.toISOString()
		.replace(/[-T:.Z]/g, '')
		.slice(0, 14);
	const filename = `${timestamp}${suffix}.md`;

	const targetDir = isPinned ? path.join(ENTRIES_DIR, 'pinned') : ENTRIES_DIR;
	const filePath = path.join(targetDir, filename);

	await ensureDir(targetDir);
	await fs.writeFile(filePath, content, 'utf8');

	return filename;
}

// Mark message as read
export async function markMessageAsRead(
	alias: string,
	publicKey: string,
	filename: string
): Promise<void> {
	const readStatus = await getReadStatus();
	const fileKey = getFileKey(alias, publicKey, filename);
	readStatus[fileKey] = true;
	await saveReadStatus(readStatus);
}
