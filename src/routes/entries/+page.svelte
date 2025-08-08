<script lang="ts">
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toast-store';
	import MarkdownRenderer from '../../components/MarkdownRenderer.svelte';
	import {
		getEntries,
		addEntry,
		updateEntry,
		renameEntry,
		toggleEntryPin,
		removeEntry
	} from '$lib/services/entry-service';
	import { getPeers } from '$lib/services/peer-service';
	import type { Entry, CreateEntryRequest } from '$lib/types/entry';
	import type { Peer } from '$lib/types/peer';

	// Icon components
	import EditIcon from '../../assets/EditIcon.svelte';
	import PinIcon from '../../assets/PinIcon.svelte';
	import UnpinIcon from '../../assets/UnpinIcon.svelte';
	import DeleteIcon from '../../assets/DeleteIcon.svelte';
	import DocumentIcon from '../../assets/DocumentIcon.svelte';
	import ChevronIcon from '../../assets/ChevronIcon.svelte';
	import PlusIcon from '../../assets/PlusIcon.svelte';
	import CloseIcon from '../../assets/CloseIcon.svelte';

	// State
	let entries: Entry[] = [];
	let peers: Peer[] = [];
	let loading = false;
	let error: string | null = null;
	let showCreateModal = false;
	let showEditModal = false;
	let showDeleteModal = false;

	// Form state
	let newEntryContent = '';
	let newEntryIsPinned = false;
	let newEntrySuffix = '';
	let newEntryTo: string[] = [];
	let newEntryExcept: string[] = [];
	let newEntrySourcePath = '';
	let newEntryDestinationPath = '';
	let creatingEntry = false;

	// Dropdown states
	let showToDropdown = false;
	let showExceptDropdown = false;

	// Helper functions for peer selection
	function togglePeerInTo(peerAlias: string) {
		if (newEntryTo.includes(peerAlias)) {
			newEntryTo = newEntryTo.filter((p) => p !== peerAlias);
		} else {
			// Remove from except if it's there
			newEntryExcept = newEntryExcept.filter((p) => p !== peerAlias);
			newEntryTo = [...newEntryTo, peerAlias];
		}
	}

	function togglePeerInExcept(peerAlias: string) {
		if (newEntryExcept.includes(peerAlias)) {
			newEntryExcept = newEntryExcept.filter((p) => p !== peerAlias);
		} else {
			// Remove from to if it's there
			newEntryTo = newEntryTo.filter((p) => p !== peerAlias);
			newEntryExcept = [...newEntryExcept, peerAlias];
		}
	}

	function selectAllPeersInTo() {
		newEntryTo = peers.map((p) => p.alias);
		newEntryExcept = [];
	}

	function clearAllInTo() {
		newEntryTo = [];
	}

	function selectAllPeersInExcept() {
		newEntryExcept = peers.map((p) => p.alias);
		newEntryTo = [];
	}

	function clearAllInExcept() {
		newEntryExcept = [];
	}

	// Get available peers for selection (excluding those already selected in the other list)
	$: availableForTo = peers.filter((p) => !newEntryExcept.includes(p.alias));
	$: availableForExcept = peers.filter((p) => !newEntryTo.includes(p.alias));

	// Close dropdowns when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('.peer-dropdown')) {
			showToDropdown = false;
			showExceptDropdown = false;
		}
	}

	// Edit/action state
	let editingEntry: Entry | null = null;
	let editContent = '';
	let editFilename = '';
	let updatingEntry = false;
	let deletingEntry = false;

	// View state
	let expandedEntries = new Set<string>();

	// Load entries
	async function loadEntries() {
		loading = true;
		error = null;

		try {
			entries = await getEntries();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load entries';
		} finally {
			loading = false;
		}
	}

	// Load peers
	async function loadPeers() {
		try {
			peers = await getPeers();
		} catch (err) {
			console.warn('Failed to load peers:', err);
			peers = [];
		}
	}

	// Create new entry
	async function createEntry() {
		if (!newEntryContent.trim()) {
			addToast({
				type: 'error',
				message: 'Entry content is required'
			});
			return;
		}

		creatingEntry = true;

		try {
			const result = await addEntry({
				content: newEntryContent,
				suffix: newEntrySuffix,
				isPinned: newEntryIsPinned,
				to: newEntryTo.length > 0 ? newEntryTo : undefined,
				except: newEntryExcept.length > 0 ? newEntryExcept : undefined,
				sourcePath: newEntrySourcePath.trim() || undefined,
				destinationPath: newEntryDestinationPath.trim() || undefined
			} as CreateEntryRequest);

			addToast({
				type: 'success',
				message: `Entry created successfully${result.isPinned ? ' and pinned' : ''}`
			});

			// Reset form
			newEntryContent = '';
			newEntrySuffix = '';
			newEntryIsPinned = false;
			newEntryTo = [];
			newEntryExcept = [];
			newEntrySourcePath = '';
			newEntryDestinationPath = '';
			showToDropdown = false;
			showExceptDropdown = false;
			showCreateModal = false;

			// Reload entries
			await loadEntries();
		} catch (err) {
			addToast({
				type: 'error',
				message: err instanceof Error ? err.message : 'Failed to create entry'
			});
		} finally {
			creatingEntry = false;
		}
	}

	// Edit entry (both content and filename)
	function startEdit(entry: Entry) {
		editingEntry = entry;
		editContent = entry.content;
		editFilename = entry.filename.replace('.md', '');
		showEditModal = true;
	}

	async function saveEdit() {
		if (!editingEntry || !editContent.trim()) {
			addToast({
				type: 'error',
				message: 'Entry content is required'
			});
			return;
		}

		if (!editFilename.trim()) {
			addToast({
				type: 'error',
				message: 'Filename is required'
			});
			return;
		}

		updatingEntry = true;

		try {
			const needsRename = editFilename !== editingEntry.filename.replace('.md', '');

			// Update content first
			await updateEntry(editingEntry.filename, editContent, editingEntry.isPinned);

			// Rename if filename changed
			if (needsRename) {
				await renameEntry(editingEntry.filename, editFilename, editingEntry.isPinned);
			}

			addToast({
				type: 'success',
				message: needsRename
					? 'Entry updated and renamed successfully'
					: 'Entry updated successfully'
			});

			showEditModal = false;
			editingEntry = null;
			editContent = '';
			editFilename = '';

			// Reload entries
			await loadEntries();
		} catch (err) {
			addToast({
				type: 'error',
				message: err instanceof Error ? err.message : 'Failed to update entry'
			});
		} finally {
			updatingEntry = false;
		}
	}

	// Delete entry
	function startDelete(entry: Entry) {
		editingEntry = entry;
		showDeleteModal = true;
	}

	async function confirmDelete() {
		if (!editingEntry) return;

		deletingEntry = true;

		try {
			await removeEntry(editingEntry.filename, editingEntry.isPinned);

			addToast({
				type: 'success',
				message: 'Entry deleted successfully'
			});

			showDeleteModal = false;
			editingEntry = null;

			// Reload entries
			await loadEntries();
		} catch (err) {
			addToast({
				type: 'error',
				message: err instanceof Error ? err.message : 'Failed to delete entry'
			});
		} finally {
			deletingEntry = false;
		}
	}

	// Toggle pin status
	async function togglePin(entry: Entry) {
		try {
			await toggleEntryPin(entry.filename, entry.isPinned);

			addToast({
				type: 'success',
				message: `Entry ${entry.isPinned ? 'unpinned' : 'pinned'} successfully`
			});

			// Reload entries
			await loadEntries();
		} catch (err) {
			addToast({
				type: 'error',
				message: err instanceof Error ? err.message : 'Failed to toggle pin status'
			});
		}
	}

	// Toggle entry expansion
	function toggleEntry(filename: string) {
		if (expandedEntries.has(filename)) {
			expandedEntries.delete(filename);
		} else {
			expandedEntries.add(filename);
		}
		expandedEntries = expandedEntries; // Trigger reactivity
	}

	// Format timestamp
	function formatTimestamp(timestamp: Date | string) {
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		return date.toLocaleString();
	}

	// Get file size display
	function getFileSize(size: number) {
		return size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
	}

	// Separate pinned and regular entries
	$: pinnedEntries = entries.filter((entry) => entry.isPinned);
	$: regularEntries = entries.filter((entry) => !entry.isPinned);

	onMount(() => {
		loadEntries();
		loadPeers();
	});
</script>

<div class="h-full w-full overflow-y-auto rounded-l-md bg-white p-6">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Entries</h1>
			<p class="text-gray-600">Create and manage your markdown entries</p>
		</div>
		<button
			on:click={() => (showCreateModal = true)}
			class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			<PlusIcon />
			New Entry
		</button>
	</div>

	{#if loading}
		<div class="py-12 text-center">
			<div class="inline-flex items-center justify-center">
				<div
					class="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
				></div>
			</div>
			<p class="mt-4 text-gray-500">Loading entries...</p>
		</div>
	{:else if error}
		<div class="py-8 text-center">
			<p class="text-red-500">Error: {error}</p>
			<button on:click={loadEntries} class="mt-2 text-blue-600 hover:text-blue-700">
				Try again
			</button>
		</div>
	{:else}
		<!-- Pinned Entries -->
		{#if pinnedEntries.length > 0}
			<div class="mb-8">
				<h2 class="mb-4 flex items-center gap-2 text-lg font-medium text-gray-900">
					<PinIcon />
					Pinned Entries ({pinnedEntries.length})
				</h2>
				<div class="space-y-3">
					{#each pinnedEntries as entry}
						<div class="rounded-lg border border-yellow-200 bg-yellow-50">
							<div class="flex items-center justify-between p-4">
								<button
									class="flex flex-1 items-center gap-3 text-left hover:opacity-80"
									on:click={() => toggleEntry(entry.filename)}
								>
									<PinIcon />
									<div class="flex flex-col">
										<span class="text-sm font-medium text-gray-900">{entry.filename}</span>
										<span class="text-xs text-gray-500">
											{formatTimestamp(entry.timestamp)} • {getFileSize(entry.size)}
										</span>
									</div>
									<div
										class="ml-auto transform transition-transform {expandedEntries.has(
											entry.filename
										)
											? ''
											: 'rotate-180'}"
									>
										<ChevronIcon />
									</div>
								</button>

								<!-- Action buttons -->
								<div class="ml-4 flex items-center gap-1">
									<button
										on:click={() => startEdit(entry)}
										class="rounded p-1 text-gray-500 hover:bg-yellow-100 hover:text-gray-700"
										title="Edit entry"
										aria-label="Edit entry"
									>
										<EditIcon />
									</button>
									<button
										on:click={() => togglePin(entry)}
										class="rounded p-1 text-gray-500 hover:bg-yellow-100 hover:text-gray-700"
										title="Unpin entry"
										aria-label="Unpin entry"
									>
										<UnpinIcon />
									</button>
									<button
										on:click={() => startDelete(entry)}
										class="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700"
										title="Delete entry"
										aria-label="Delete entry"
									>
										<DeleteIcon />
									</button>
								</div>
							</div>

							{#if expandedEntries.has(entry.filename)}
								<div class="border-t border-yellow-200 px-4 pb-4">
									<div class="mt-2">
										<div class="prose prose-sm max-w-none rounded border bg-white p-4">
											<MarkdownRenderer markdownContent={entry.content} />
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Regular Entries -->
		<div>
			<h2 class="mb-4 text-lg font-medium text-gray-900">
				All Entries ({regularEntries.length})
			</h2>
			{#if regularEntries.length === 0 && pinnedEntries.length === 0}
				<div class="py-8 text-center">
					<p class="text-gray-500">No entries found</p>
				</div>
			{:else if regularEntries.length === 0}
				<div class="py-8 text-center">
					<p class="text-gray-500">No regular entries found</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each regularEntries as entry}
						<div class="rounded-lg border border-gray-200">
							<div class="flex items-center justify-between p-4">
								<button
									class="flex flex-1 items-center gap-3 text-left hover:bg-gray-50"
									on:click={() => toggleEntry(entry.filename)}
								>
									<DocumentIcon />
									<div class="flex flex-col">
										<span class="text-sm font-medium text-gray-900">{entry.filename}</span>
										<span class="text-xs text-gray-500">
											{formatTimestamp(entry.timestamp)} • {getFileSize(entry.size)}
										</span>
									</div>
									<div
										class="ml-auto transform transition-transform {expandedEntries.has(
											entry.filename
										)
											? ''
											: 'rotate-180'}"
									>
										<ChevronIcon />
									</div>
								</button>

								<!-- Action buttons -->
								<div class="ml-4 flex items-center gap-1">
									<button
										on:click={() => startEdit(entry)}
										class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
										title="Edit entry"
										aria-label="Edit entry"
									>
										<EditIcon />
									</button>
									<button
										on:click={() => togglePin(entry)}
										class="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
										title="Pin entry"
										aria-label="Pin entry"
									>
										<PinIcon />
									</button>
									<button
										on:click={() => startDelete(entry)}
										class="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700"
										title="Delete entry"
										aria-label="Delete entry"
									>
										<DeleteIcon />
									</button>
								</div>
							</div>

							{#if expandedEntries.has(entry.filename)}
								<div class="border-t border-gray-100 px-4 pb-4">
									<div class="mt-2">
										<div class="prose prose-sm max-w-none rounded border bg-white p-4">
											<MarkdownRenderer markdownContent={entry.content} />
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Create Entry Modal -->
{#if showCreateModal}
	<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		on:click={handleClickOutside}
	>
		<div class="w-full max-w-2xl rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Create New Entry</h3>
				<button
					on:click={() => (showCreateModal = false)}
					class="text-gray-500 hover:text-gray-700"
				>
					<CloseIcon />
				</button>
			</div>

			<form on:submit|preventDefault={createEntry} class="space-y-4">
				<!-- Content -->
				<div>
					<label for="content" class="block text-sm font-medium text-gray-700">Content</label>
					<textarea
						id="content"
						bind:value={newEntryContent}
						rows="10"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="Write your markdown content here..."
						required
					></textarea>
				</div>

				<!-- Suffix -->
				<div>
					<label for="suffix" class="block text-sm font-medium text-gray-700">
						Filename Suffix (optional)
					</label>
					<input
						type="text"
						id="suffix"
						bind:value={newEntrySuffix}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="e.g., _my-note"
					/>
					<p class="mt-1 text-xs text-gray-500">
						Will be added to the timestamp filename (e.g., 20231201123000_my-note.md)
					</p>
				</div>

				<!-- Draft Report Fields -->
				<div class="border-t pt-4">
					<h4 class="mb-3 text-sm font-medium text-gray-900">Draft Report Configuration</h4>

					<!-- To (Recipients) -->
					<div class="mb-4">
						<label for="toField" class="mb-2 block text-sm font-medium text-gray-700"
							>To (Recipients)</label
						>
						<div class="peer-dropdown relative">
							<button
								type="button"
								id="toField"
								on:click={() => (showToDropdown = !showToDropdown)}
								class="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-left focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							>
								<span class="block truncate text-sm">
									{#if newEntryTo.length === 0}
										Select peers to send this report to...
									{:else if newEntryTo.length === peers.length}
										All peers ({newEntryTo.length})
									{:else}
										{newEntryTo.length} peer{newEntryTo.length !== 1 ? 's' : ''} selected
									{/if}
								</span>
								<span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
									<svg
										class="h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 9l4-4 4 4m0 6l-4 4-4-4"
										></path>
									</svg>
								</span>
							</button>

							{#if showToDropdown}
								<div
									class="ring-opacity-5 absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none"
								>
									<!-- Select All / Clear All buttons -->
									<div class="border-b border-gray-200 p-2">
										<div class="flex gap-2">
											<button
												type="button"
												on:click={selectAllPeersInTo}
												class="flex-1 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200"
											>
												Select All
											</button>
											<button
												type="button"
												on:click={clearAllInTo}
												class="flex-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
											>
												Clear All
											</button>
										</div>
									</div>

									{#each availableForTo as peer}
										<button
											type="button"
											on:click={() => togglePeerInTo(peer.alias)}
											class="relative w-full cursor-pointer py-2 pr-4 pl-8 text-left text-sm select-none hover:bg-blue-50"
										>
											{#if newEntryTo.includes(peer.alias)}
												<span
													class="absolute inset-y-0 left-0 flex items-center pl-2 text-blue-600"
												>
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clip-rule="evenodd"
														></path>
													</svg>
												</span>
											{/if}
											<span class="block font-normal">{peer.alias}</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
						<p class="mt-1 text-xs text-gray-500">
							Selected peers: {newEntryTo.join(', ') || 'None'}
						</p>
					</div>

					<!-- Except -->
					<div class="mb-4">
						<label for="exceptField" class="mb-2 block text-sm font-medium text-gray-700"
							>Except (Exclude)</label
						>
						<div class="peer-dropdown relative">
							<button
								type="button"
								id="exceptField"
								on:click={() => (showExceptDropdown = !showExceptDropdown)}
								class="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-left focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							>
								<span class="block truncate text-sm">
									{#if newEntryExcept.length === 0}
										Select peers to exclude from this report...
									{:else if newEntryExcept.length === peers.length}
										All peers excluded ({newEntryExcept.length})
									{:else}
										{newEntryExcept.length} peer{newEntryExcept.length !== 1 ? 's' : ''} excluded
									{/if}
								</span>
								<span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
									<svg
										class="h-5 w-5 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 9l4-4 4 4m0 6l-4 4-4-4"
										></path>
									</svg>
								</span>
							</button>

							{#if showExceptDropdown}
								<div
									class="ring-opacity-5 absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none"
								>
									<!-- Select All / Clear All buttons -->
									<div class="border-b border-gray-200 p-2">
										<div class="flex gap-2">
											<button
												type="button"
												on:click={selectAllPeersInExcept}
												class="flex-1 rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200"
											>
												Exclude All
											</button>
											<button
												type="button"
												on:click={clearAllInExcept}
												class="flex-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
											>
												Clear All
											</button>
										</div>
									</div>

									{#each availableForExcept as peer}
										<button
											type="button"
											on:click={() => togglePeerInExcept(peer.alias)}
											class="relative w-full cursor-pointer py-2 pr-4 pl-8 text-left text-sm select-none hover:bg-red-50"
										>
											{#if newEntryExcept.includes(peer.alias)}
												<span class="absolute inset-y-0 left-0 flex items-center pl-2 text-red-600">
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clip-rule="evenodd"
														></path>
													</svg>
												</span>
											{/if}
											<span class="block font-normal">{peer.alias}</span>
										</button>
									{/each}
								</div>
							{/if}
						</div>
						<p class="mt-1 text-xs text-gray-500">
							Excluded peers: {newEntryExcept.join(', ') || 'None'}
						</p>
					</div>

					<!-- Source Path -->
					<div class="mb-4">
						<label for="sourcePath" class="block text-sm font-medium text-gray-700">
							Source Path (optional)
						</label>
						<input
							type="text"
							id="sourcePath"
							bind:value={newEntrySourcePath}
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							placeholder="e.g., path/to/source"
						/>
						<p class="mt-1 text-xs text-gray-500">Source path for the report</p>
					</div>

					<!-- Destination Path -->
					<div class="mb-4">
						<label for="destinationPath" class="block text-sm font-medium text-gray-700">
							Destination Path (optional)
						</label>
						<input
							type="text"
							id="destinationPath"
							bind:value={newEntryDestinationPath}
							class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							placeholder="e.g., path/to/destination"
						/>
						<p class="mt-1 text-xs text-gray-500">Destination path for the report</p>
					</div>
				</div>

				<!-- Pin option -->
				<div class="flex items-center">
					<input
						type="checkbox"
						id="isPinned"
						bind:checked={newEntryIsPinned}
						class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<label for="isPinned" class="ml-2 block text-sm text-gray-900"> Pin this entry </label>
				</div>

				<!-- Actions -->
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						on:click={() => (showCreateModal = false)}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={creatingEntry}
						class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{#if creatingEntry}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
							></div>
						{/if}
						{creatingEntry ? 'Creating...' : 'Create Entry'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Entry Modal -->
{#if showEditModal && editingEntry}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
		<div class="w-full max-w-2xl rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Edit Entry</h3>
				<button on:click={() => (showEditModal = false)} class="text-gray-500 hover:text-gray-700">
					<CloseIcon />
				</button>
			</div>

			<form on:submit|preventDefault={saveEdit} class="space-y-4">
				<!-- Filename -->
				<div>
					<label for="editFilename" class="block text-sm font-medium text-gray-700">Filename</label>
					<input
						type="text"
						id="editFilename"
						bind:value={editFilename}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="Enter filename"
						required
					/>
					<p class="mt-1 text-xs text-gray-500">
						.md extension will be added automatically if not present
					</p>
				</div>

				<!-- Content -->
				<div>
					<label for="editContent" class="block text-sm font-medium text-gray-700">Content</label>
					<textarea
						id="editContent"
						bind:value={editContent}
						rows="10"
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						required
					></textarea>
				</div>

				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						on:click={() => (showEditModal = false)}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={updatingEntry}
						class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
					>
						{#if updatingEntry}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
							></div>
						{/if}
						{updatingEntry ? 'Saving...' : 'Save Changes'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Entry Modal -->
{#if showDeleteModal && editingEntry}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Delete Entry</h3>
				<button
					on:click={() => (showDeleteModal = false)}
					class="text-gray-500 hover:text-gray-700"
				>
					<CloseIcon />
				</button>
			</div>

			<div class="mb-6">
				<p class="text-sm text-gray-700">
					Are you sure you want to delete <strong>{editingEntry.filename}</strong>?
				</p>
				<p class="mt-2 text-sm text-red-600">This action cannot be undone.</p>
			</div>

			<div class="flex justify-end gap-3">
				<button
					on:click={() => (showDeleteModal = false)}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					on:click={confirmDelete}
					disabled={deletingEntry}
					class="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
				>
					{#if deletingEntry}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
						></div>
					{/if}
					{deletingEntry ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
