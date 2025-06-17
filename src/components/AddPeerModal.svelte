<script lang="ts">
	import { addToast } from '$lib/stores/toast-store';

	export let isOpen = false;
	export let onClose: () => void = () => {};
	export let onPeerAdded: (data: { alias: string; publicKey: string }) => void = () => {};

	let alias = '';
	let publicKey = '';
	let isSubmitting = false;

	async function handleSubmit() {
		if (!alias.trim() || !publicKey.trim()) {
			addToast({
				type: 'error',
				message: 'Please fill in both alias and public key'
			});
			return;
		}

		if (alias.includes('-')) {
			addToast({
				type: 'error',
				message: 'Alias cannot contain hyphens'
			});
			return;
		}

		if (!/^[a-f0-9]{64}$/.test(publicKey)) {
			addToast({
				type: 'error',
				message: 'Public key must be 64 lowercase hexadecimal characters'
			});
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/peers', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ alias: alias.trim(), publicKey: publicKey.trim() })
			});

			if (response.ok) {
				addToast({
					type: 'success',
					message: `Peer "${alias}" added successfully!`
				});

				// Notify parent component
				onPeerAdded({ alias: alias.trim(), publicKey: publicKey.trim() });
				closeModal();
			} else {
				const errorData = await response.json();
				addToast({
					type: 'error',
					message: errorData.error || 'Failed to add peer'
				});
			}
		} catch (error) {
			addToast({
				type: 'error',
				message: 'Network error: Could not add peer'
			});
		} finally {
			isSubmitting = false;
		}
	}

	function closeModal() {
		isOpen = false;
		alias = '';
		publicKey = '';
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
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
		on:click={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-6 flex items-center justify-between">
				<h2 id="modal-title" class="text-xl font-bold text-gray-900">Add New Peer</h2>
				<button
					on:click={closeModal}
					class="text-gray-400 hover:text-gray-600"
					aria-label="Close modal"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
						<path
							d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
						/>
					</svg>
				</button>
			</div>

			<form on:submit|preventDefault={handleSubmit} class="space-y-4">
				<div>
					<label for="alias" class="mb-2 block text-sm font-medium text-gray-700"> Alias </label>
					<input
						id="alias"
						type="text"
						bind:value={alias}
						placeholder="Enter peer alias (e.g., john)"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
						required
						disabled={isSubmitting}
					/>
					<p class="mt-1 text-xs text-gray-500">Cannot contain hyphens</p>
				</div>

				<div>
					<label for="publicKey" class="mb-2 block text-sm font-medium text-gray-700">
						Public Key
					</label>
					<textarea
						id="publicKey"
						bind:value={publicKey}
						placeholder="Enter 64-character hexadecimal public key"
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
						required
						disabled={isSubmitting}
					></textarea>
					<p class="mt-1 text-xs text-gray-500">
						Must be exactly 64 lowercase hexadecimal characters
					</p>
				</div>

				<div class="flex gap-3 pt-4">
					<button
						type="button"
						on:click={closeModal}
						class="flex-1 rounded-md bg-gray-200 px-4 py-2 font-medium text-gray-800 transition-colors hover:bg-gray-300"
						disabled={isSubmitting}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
						disabled={isSubmitting}
					>
						{#if isSubmitting}
							<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
							Adding...
						{:else}
							Add Peer
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
