import type { Peer } from '../types/peer';

export const getPeers = async () => {
	const response = await fetch('/api/peers');
	if (!response.ok) {
		throw new Error('Failed to fetch peers');
	}
	return response.json();
};

export const addPeer = async (peer: Peer) => {
	const response = await fetch('/api/peers', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(peer)
	});
	if (!response.ok) {
		throw new Error('Failed to add peer');
	}
	return response.json();
};

export const removePeer = async (peer: Peer) => {
	const response = await fetch('/api/peers', {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(peer)
	});
	if (!response.ok) {
		throw new Error('Failed to remove peer');
	}
	return response.json();
};

// Get outgoing markdown files for a specific peer
export const getPeerOutgoing = async (alias: string, publicKey: string) => {
	const response = await fetch(
		`/api/messages/outgoing?alias=${encodeURIComponent(alias)}&publicKey=${encodeURIComponent(publicKey)}`
	);
	if (!response.ok) {
		throw new Error('Failed to fetch outgoing files');
	}
	return response.json();
};

// Get incoming markdown files for a specific peer
export const getPeerIncoming = async (alias: string, publicKey: string) => {
	const response = await fetch(
		`/api/messages/incoming?alias=${encodeURIComponent(alias)}&publicKey=${encodeURIComponent(publicKey)}`
	);
	if (!response.ok) {
		throw new Error('Failed to fetch incoming files');
	}
	return response.json();
};
