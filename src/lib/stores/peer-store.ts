import { writable } from 'svelte/store';
import type { Peer } from '$lib/types/peer';
import { getPeers, addPeer, removePeer } from '$lib/services/peer-service';
import { addToast } from './toast-store';
import { soundManager } from '$lib/utils/sound';

// Create a writable store for peers
export const peers = writable<Peer[]>([]);

// Track previous peer data for change detection
let previousPeerData: Peer[] = [];

// Function to load peers
export async function loadPeers(showNotifications = true) {
	try {
		const peerData = await getPeers();

		// Check for changes and show notifications if enabled
		if (showNotifications && previousPeerData.length > 0) {
			detectAndNotifyChanges(previousPeerData, peerData);
		}

		// Update store and previous data
		peers.set(peerData);
		previousPeerData = JSON.parse(JSON.stringify(peerData)); // Deep copy
	} catch (error) {
		console.error('Error loading peers:', error);
	}
}

// Function to detect changes and show notifications
function detectAndNotifyChanges(oldPeers: Peer[], newPeers: Peer[]) {
	let hasNewFiles = false;

	newPeers.forEach((newPeer) => {
		const oldPeer = oldPeers.find((p) => p.publicKey === newPeer.publicKey);

		if (oldPeer) {
			// Check for incoming file changes
			if (newPeer.incomingCount > oldPeer.incomingCount) {
				const newFiles = newPeer.incomingCount - oldPeer.incomingCount;
				addToast({
					type: 'info',
					message: `📥 ${newFiles} new incoming file${newFiles > 1 ? 's' : ''} from ${newPeer.alias}`,
					duration: 5000
				});
				hasNewFiles = true;
			}

			// Check for outgoing file changes
			if (newPeer.outgoingCount > oldPeer.outgoingCount) {
				const newFiles = newPeer.outgoingCount - oldPeer.outgoingCount;
				addToast({
					type: 'success',
					message: `📤 ${newFiles} new outgoing file${newFiles > 1 ? 's' : ''} to ${newPeer.alias}`,
					duration: 5000
				});
				hasNewFiles = true;
			}
		}
	});

	// Play notification sound if any new files were detected
	if (hasNewFiles) {
		soundManager.playNotificationSound();
	}
}

// Function to add a new peer
export async function addNewPeer(peer: Peer) {
	try {
		await addPeer(peer);
		// Reload peers to get the updated list (no notifications for manual actions)
		await loadPeers(false);
	} catch (error) {
		console.error('Error adding peer:', error);
	}
}

// Function to remove a peer
export async function removePeerFromStore(peer: Peer) {
	try {
		await removePeer(peer);
		// Reload peers to get the updated list (no notifications for manual actions)
		await loadPeers(false);
	} catch (error) {
		console.error('Error removing peer:', error);
	}
}
