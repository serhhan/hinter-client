<script lang="ts">
	import type { Peer } from '$lib/types/peer';
	import PeerDropdown from './PeerDropdown.svelte';
	import CloseIcon from '../assets/CloseIcon.svelte';

	interface Props {
		isOpen?: boolean;
		peers?: Peer[];
		creating?: boolean;
		onclose?: () => void;
		onsubmit?: (data: {
			content: string;
			isPinned: boolean;
			suffix: string;
			to: string[];
			except: string[];
			sourcePath: string;
			destinationPath: string;
		}) => void;
	}

	let {
		isOpen = $bindable(false),
		peers = [],
		creating = false,
		onclose,
		onsubmit
	}: Props = $props();

	// Form state
	let content = $state('');
	let isPinned = $state(false);
	let suffix = $state('');
	let to = $state<string[]>([]);
	let except = $state<string[]>([]);
	let sourcePath = $state('');
	let destinationPath = $state('');

	function handleSubmit() {
		if (!content.trim()) return;

		onsubmit?.({
			content,
			isPinned,
			suffix,
			to,
			except,
			sourcePath,
			destinationPath
		});
	}

	function handleClose() {
		// Reset form
		content = '';
		suffix = '';
		isPinned = false;
		to = [];
		except = [];
		sourcePath = '';
		destinationPath = '';

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

{#if isOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onclick={handleClickOutside}
		onkeydown={(e) => e.key === 'Enter' && handleClose()}
	>
		<div class="w-full max-w-2xl rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Create New Entry</h3>
				<button onclick={handleClose} class="text-gray-500 hover:text-gray-700">
					<CloseIcon />
				</button>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-4"
			>
				<!-- Content -->
				<div>
					<label for="newContent" class="block text-sm font-medium text-gray-700">Content</label>
					<textarea
						id="newContent"
						bind:value={content}
						rows="8"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="Enter your entry content..."
						required
					></textarea>
				</div>

				<!-- Filename and Pin -->
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="newSuffix" class="block text-sm font-medium text-gray-700">
							Filename suffix (optional)
						</label>
						<input
							type="text"
							id="newSuffix"
							bind:value={suffix}
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							placeholder="e.g., draft, final"
						/>
						<p class="mt-1 text-xs text-gray-500">Will be added to the auto-generated filename</p>
					</div>
					<div class="flex items-center pt-6">
						<input
							type="checkbox"
							id="newPinned"
							bind:checked={isPinned}
							class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<label for="newPinned" class="ml-2 text-sm text-gray-700">Pin this entry</label>
					</div>
				</div>

				<!-- Draft Report Fields -->
				<div class="border-t pt-4">
					<h4 class="mb-3 text-sm font-medium text-gray-900">Draft Report Configuration</h4>

					<!-- Peer Dropdowns -->
					<div class="grid grid-cols-1 gap-4">
						<PeerDropdown
							{peers}
							bind:selectedPeers={to}
							excludedPeers={except}
							label="To (Recipients)"
							placeholder="Select peers to send this report to..."
							id="toField"
							variant="to"
						/>

						<PeerDropdown
							{peers}
							bind:selectedPeers={except}
							excludedPeers={to}
							label="Except (Exclude)"
							placeholder="Select peers to exclude from this report..."
							id="exceptField"
							variant="except"
						/>
					</div>

					<!-- Source and Destination Paths -->
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="newSourcePath" class="block text-sm font-medium text-gray-700">
								Source Path (optional)
							</label>
							<input
								type="text"
								id="newSourcePath"
								bind:value={sourcePath}
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								placeholder="Enter source path"
							/>
						</div>
						<div>
							<label for="newDestinationPath" class="block text-sm font-medium text-gray-700">
								Destination Path (optional)
							</label>
							<input
								type="text"
								id="newDestinationPath"
								bind:value={destinationPath}
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								placeholder="Enter destination path"
							/>
						</div>
					</div>
				</div>

				<!-- Submit Buttons -->
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={handleClose}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={creating || !content.trim()}
						class="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{#if creating}
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
							Creating...
						{:else}
							Create Entry
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
