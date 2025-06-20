<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { peers, loadPeers } from '$lib/stores/peer-store';
	import { addToast } from '$lib/stores/toast-store';
	import PeerCard from './PeerCard.svelte';
	import AddPeerModal from './AddPeerModal.svelte';
	import type { Peer } from '$lib/types/peer';

	let showAddPeerModal = false;
	let pollInterval: NodeJS.Timeout | null = null;

	onMount(async () => {
		// Initial load without notifications
		await loadPeers(false);

		// Start polling for updates every 5 seconds with notifications enabled
		if (browser) {
			pollInterval = setInterval(async () => {
				await loadPeers(true); // Enable notifications for polling
			}, 5000);
		}
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	});

	async function removePeer(peer: Peer) {
		if (
			!confirm(`Are you sure you want to remove "${peer.alias}"? This action cannot be undone.`)
		) {
			return;
		}

		try {
			const response = await fetch(
				`/api/peers/${encodeURIComponent(peer.alias)}/${encodeURIComponent(peer.publicKey)}`,
				{
					method: 'DELETE'
				}
			);

			if (response.ok) {
				addToast({
					type: 'success',
					message: `Peer "${peer.alias}" removed successfully`
				});

				// Reload peers without notifications
				await loadPeers(false);
			} else {
				const errorData = await response.json();
				addToast({
					type: 'error',
					message: errorData.error || 'Failed to remove peer'
				});
			}
		} catch (error) {
			addToast({
				type: 'error',
				message: 'Network error: Could not remove peer'
			});
		}
	}

	function handlePeerAdded() {
		// Reload peers without notifications
		loadPeers(false);
	}
</script>

<div class="flex h-full flex-col rounded-r-md bg-white/80 py-4">
	<!-- Header with Add Button -->
	<div class="mb-4 flex items-center justify-between px-4">
		<h2 class="text-lg font-semibold text-gray-900">Peers</h2>
		<button
			on:click={() => (showAddPeerModal = true)}
			class="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
			title="Add new peer"
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			Add
		</button>
	</div>

	<!-- Peer Cards with Remove Buttons -->
	<div class="flex-1 overflow-y-auto px-2">
		{#if $peers.length === 0}
			<div class="py-8 text-center">
				<p class="mb-3 text-sm text-gray-500">No peers yet</p>
				<button
					on:click={() => (showAddPeerModal = true)}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
				>
					Add First Peer
				</button>
			</div>
		{:else}
			{#each $peers as peer}
				<div class="group relative mb-2">
					<PeerCard {peer} />
					<!-- Remove Button (appears on hover) -->
					<button
						on:click={() => removePeer(peer)}
						class="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
						title="Remove peer"
						aria-label="Remove peer"
					>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
							/>
						</svg>
					</button>
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Add Peer Modal Component -->
<AddPeerModal
	bind:isOpen={showAddPeerModal}
	onClose={() => (showAddPeerModal = false)}
	onPeerAdded={handlePeerAdded}
/>
