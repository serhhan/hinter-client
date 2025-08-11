<script lang="ts">
	import { addToast } from '$lib/stores/toast-store';
	import type { Peer } from '$lib/types/peer';
	import {
		validatePeerAlias,
		validatePublicKey,
		formatPeerInfo
	} from '$lib/utils/peer-config-utils';

	export let isOpen = false;
	export let peer: Peer | null = null;
	export let onClose: () => void = () => {};
	export let onPeerUpdated: (data: { oldAlias: string; newAlias: string }) => void = () => {};

	let newAlias = '';
	let newPublicKey = '';
	let isSubmitting = false;

	// Auto-populate form when peer changes
	$: if (peer && isOpen) {
		newAlias = peer.alias;
		newPublicKey = peer.publicKey;
	}

	// Enhanced validation
	$: aliasValidation = validatePeerAlias(newAlias);
	$: publicKeyValidation = validatePublicKey(newPublicKey);
	$: peerInfo = peer ? formatPeerInfo(peer) : null;

	async function handleSubmit() {
		if (!peer || !newAlias.trim() || !newPublicKey.trim()) {
			addToast({
				type: 'error',
				message: 'Please fill in all fields'
			});
			return;
		}

		// Validate inputs
		if (!aliasValidation.isValid) {
			addToast({
				type: 'error',
				message: aliasValidation.error || 'Invalid alias'
			});
			return;
		}

		if (!publicKeyValidation.isValid) {
			addToast({
				type: 'error',
				message: publicKeyValidation.error || 'Invalid public key'
			});
			return;
		}

		// Check if anything changed
		if (newAlias.trim() === peer.alias && newPublicKey.trim() === peer.publicKey) {
			addToast({
				type: 'info',
				message: 'No changes made'
			});
			closeModal();
			return;
		}

		isSubmitting = true;

		try {
			let shouldNavigateToNewKey = false;

			// Update alias if changed
			if (newAlias.trim() !== peer.alias) {
				const response = await fetch(
					`/api/peers/${encodeURIComponent(peer.alias)}/${encodeURIComponent(peer.publicKey)}`,
					{
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ newAlias: newAlias.trim() })
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to update alias');
				}
			}

			// Update public key if changed
			if (newPublicKey.trim() !== peer.publicKey) {
				const response = await fetch(
					`/api/peers/${encodeURIComponent(newAlias.trim())}/${encodeURIComponent(peer.publicKey)}`,
					{
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ newPublicKey: newPublicKey.trim() })
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || 'Failed to update public key');
				}
				shouldNavigateToNewKey = true;
			}

			addToast({
				type: 'success',
				message: 'Peer updated successfully!'
			});

			// Notify parent component
			onPeerUpdated({ oldAlias: peer.alias, newAlias: newAlias.trim() });
			closeModal();

			// Navigate to new URL if public key changed
			if (shouldNavigateToNewKey) {
				window.location.href = `/peers/${encodeURIComponent(newPublicKey.trim())}`;
			}
		} catch (error) {
			addToast({
				type: 'error',
				message: error instanceof Error ? error.message : 'Network error: Could not update peer'
			});
		} finally {
			isSubmitting = false;
		}
	}

	function closeModal() {
		isOpen = false;
		newAlias = '';
		newPublicKey = '';
		isSubmitting = false;
		onClose();
	}

	// Close modal when clicking outside
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			closeModal();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
		on:click={handleBackdropClick}
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6" on:click|stopPropagation>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Edit Peer</h3>
				<button
					on:click={closeModal}
					class="text-gray-500 hover:text-gray-700"
					aria-label="Close modal"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			{#if peer}
				<form on:submit|preventDefault={handleSubmit} class="space-y-4">
					<!-- Current Info -->
					<div class="rounded-md border border-gray-200 bg-gray-50 p-3">
						<h4 class="mb-2 text-sm font-medium text-gray-700">Current Information</h4>
						<div class="space-y-1">
							<p class="text-sm"><span class="font-medium">Alias:</span> {peer.alias}</p>
							<p class="text-sm">
								<span class="font-medium">Public Key:</span>
								{peer.publicKey.slice(0, 16)}...
							</p>
							<p class="text-sm">
								<span class="font-medium">Groups:</span>
								{peer.groups.join(', ')}
							</p>
						</div>
					</div>

					<!-- Edit Fields -->
					<div>
						<label for="newAlias" class="block text-sm font-medium text-gray-700"> Alias </label>
						<input
							type="text"
							id="newAlias"
							bind:value={newAlias}
							placeholder="Enter peer alias"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							required
						/>
						<p class="mt-1 text-xs text-gray-500">Cannot contain hyphens</p>
					</div>

					<div>
						<label for="newPublicKey" class="block text-sm font-medium text-gray-700">
							Public Key
						</label>
						<input
							type="text"
							id="newPublicKey"
							bind:value={newPublicKey}
							placeholder="64-character hex public key"
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							required
						/>
						<p class="mt-1 text-xs text-gray-500">Must be 64 lowercase hexadecimal characters</p>
					</div>

					<!-- Note about groups -->
					<div class="rounded-md border border-blue-200 bg-blue-50 p-3">
						<div class="flex">
							<svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
									clip-rule="evenodd"
								/>
							</svg>
							<div class="ml-3">
								<h4 class="text-sm font-medium text-blue-800">Group Management</h4>
								<p class="text-sm text-blue-700">
									To modify group assignments, use the <a href="/groups" class="underline"
										>Groups page</a
									>.
								</p>
							</div>
						</div>
					</div>

					<!-- Submit Buttons -->
					<div class="flex justify-end gap-3 pt-4">
						<button
							type="button"
							on:click={closeModal}
							class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting || !newAlias.trim() || newAlias.trim() === peer.alias}
							class="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
						>
							{#if isSubmitting}
								<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Updating...
							{:else}
								Update Peer
							{/if}
						</button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
