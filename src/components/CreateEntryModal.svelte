<script lang="ts">
	import type { Peer } from '$lib/types/peer';
	import PeerDropdown from './PeerDropdown.svelte';
	import CloseIcon from '../assets/CloseIcon.svelte';
	import {
		validateDestinationPath,
		getDestinationPreview,
		normalizePath
	} from '$lib/utils/path-utils';

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
			sourceFiles: string[];
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
	let sourceFiles = $state<File[]>([]);
	let destinationPath = $state('');

	// Path validation
	const destinationPathValidation = $derived(validateDestinationPath(destinationPath));
	const isPathValid = $derived(destinationPathValidation.isValid);

	// Destination preview
	const destinationPreview = $derived(
		getDestinationPreview('', destinationPath, `${suffix || 'report'}.md`)
	);

	async function handleSubmit() {
		if (!content.trim() || !isPathValid) return;

		let uploadedFilePaths: string[] = [];

		// Upload files if any are selected
		if (sourceFiles.length > 0) {
			const formData = new FormData();
			sourceFiles.forEach((file) => formData.append('files', file));

			try {
				const response = await fetch('/api/upload', {
					method: 'POST',
					body: formData
				});

				if (response.ok) {
					const result = await response.json();
					uploadedFilePaths = result.files;
				} else {
					console.error('Failed to upload files');
					return;
				}
			} catch (error) {
				console.error('Error uploading files:', error);
				return;
			}
		}

		onsubmit?.({
			content,
			isPinned,
			suffix,
			to,
			except,
			sourceFiles: uploadedFilePaths,
			destinationPath: normalizePath(destinationPath)
		});
	}

	function handleClose() {
		// Reset form
		content = '';
		suffix = '';
		isPinned = false;
		to = [];
		except = [];
		sourceFiles = [];
		destinationPath = '';

		onclose?.();
	}

	function handleFileInput(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files) {
			sourceFiles = Array.from(input.files);
		}
	}

	function removeFile(index: number) {
		sourceFiles = sourceFiles.filter((_, i) => i !== index);
	}

	function openFileDialog() {
		const input = document.createElement('input');
		input.type = 'file';
		input.multiple = true;
		input.onchange = handleFileInput;
		input.click();
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

					<!-- Files and Destination -->
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="fileSelectButton" class="block text-sm font-medium text-gray-700">
								Additional Files (optional)
							</label>
							<button
								type="button"
								id="fileSelectButton"
								onclick={openFileDialog}
								class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-left hover:bg-gray-50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							>
								{#if sourceFiles.length === 0}
									<span class="text-gray-500">Select files...</span>
								{:else}
									<span class="text-gray-900">{sourceFiles.length} files selected</span>
								{/if}
							</button>

							{#if sourceFiles.length > 0}
								<div class="mt-2 space-y-1">
									{#each sourceFiles as file, index}
										<div
											class="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-sm"
										>
											<span class="truncate">{file.name}</span>
											<button
												type="button"
												onclick={() => removeFile(index)}
												class="ml-2 text-red-500 hover:text-red-700"
												aria-label="Remove file"
											>
												×
											</button>
										</div>
									{/each}
								</div>
								<p class="mt-1 text-xs text-green-600">✓ Files will be included with report</p>
							{:else}
								<p class="mt-1 text-xs text-gray-500">Report content only</p>
							{/if}
						</div>
						<div>
							<label for="newDestinationPath" class="block text-sm font-medium text-gray-700">
								Package Destination (optional)
							</label>
							<input
								type="text"
								id="newDestinationPath"
								bind:value={destinationPath}
								class="mt-1 block w-full rounded-md border {destinationPathValidation.isValid
									? 'border-gray-300'
									: 'border-red-300'} px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								placeholder="e.g., reports/weekly"
							/>
							{#if !destinationPathValidation.isValid}
								<p class="mt-1 text-xs text-red-600">{destinationPathValidation.error}</p>
							{:else}
								<p class="mt-1 text-xs text-gray-500">
									Package will be saved as: <strong>{destinationPreview}</strong>
									{#if sourceFiles.length > 0}
										<br /><span class="text-green-600"
											>+ {sourceFiles.length} additional files included</span
										>
									{/if}
								</p>
							{/if}
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
						disabled={creating || !content.trim() || !isPathValid}
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
