<script lang="ts">
	import type { Entry } from '$lib/types/entry';
	import CloseIcon from '../assets/CloseIcon.svelte';

	interface Props {
		isOpen?: boolean;
		entry?: Entry | null;
		deleting?: boolean;
		onclose?: () => void;
		onconfirm?: () => void;
	}

	let {
		isOpen = $bindable(false),
		entry = null,
		deleting = false,
		onclose,
		onconfirm
	}: Props = $props();

	function handleConfirm() {
		onconfirm?.();
	}

	function handleClose() {
		onclose?.();
	}

	// Close on Escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen) {
			handleClose();
		}
	}

	// Handle click outside to close
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (target === event.currentTarget) {
			handleClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && entry}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={handleClickOutside}
		onkeydown={(e) => e.key === 'Enter' && handleClose()}
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Delete Entry</h3>
				<button onclick={handleClose} class="text-gray-500 hover:text-gray-700">
					<CloseIcon />
				</button>
			</div>

			<div class="mb-6">
				<p class="text-sm text-gray-600">
					Are you sure you want to delete the entry <strong>{entry.filename}</strong>?
				</p>
				<p class="mt-2 text-sm text-red-600">This action cannot be undone.</p>
			</div>

			<div class="flex justify-end gap-3">
				<button
					type="button"
					onclick={handleClose}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					disabled={deleting}
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					disabled={deleting}
					class="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
				>
					{#if deleting}
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
						Deleting...
					{:else}
						Delete Entry
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
