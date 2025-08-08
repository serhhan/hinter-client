<script lang="ts">
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toast-store';
	import CreateEntryModal from '../../components/CreateEntryModal.svelte';
	import EditEntryModal from '../../components/EditEntryModal.svelte';
	import DeleteEntryModal from '../../components/DeleteEntryModal.svelte';
	import EntryCard from '../../components/EntryCard.svelte';
	import {
		getEntries,
		addEntry,
		updateEntry,
		renameEntry,
		toggleEntryPin,
		removeEntry
	} from '$lib/services/entry-service';
	import { getPeers } from '$lib/services/peer-service';
	import { parseMetadata, generateMetadataHeader } from '$lib/utils/metadata-parser';
	import type { Entry, CreateEntryRequest } from '$lib/types/entry';
	import type { Peer } from '$lib/types/peer';

	// Icon components
	import PinIcon from '../../assets/PinIcon.svelte';
	import PlusIcon from '../../assets/PlusIcon.svelte';

	// State
	let entries: Entry[] = [];
	let peers: Peer[] = [];
	let loading = false;
	let error: string | null = null;
	let showCreateModal = false;
	let showEditModal = false;
	let showDeleteModal = false;
	let creatingEntry = false;
	let updatingEntry = false;
	let deletingEntry = false;

	// Edit/action state
	let editingEntry: Entry | null = null;

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

	// Create entry handler
	async function handleCreateEntry(data: {
		content: string;
		isPinned: boolean;
		suffix: string;
		to: string[];
		except: string[];
		sourcePath: string;
		destinationPath: string;
	}) {
		const { content, isPinned, suffix, to, except, sourcePath, destinationPath } = data;

		creatingEntry = true;

		try {
			const result = await addEntry({
				content,
				suffix,
				isPinned,
				to: to.length > 0 ? to : undefined,
				except: except.length > 0 ? except : undefined,
				sourcePath: sourcePath.trim() || undefined,
				destinationPath: destinationPath.trim() || undefined
			} as CreateEntryRequest);

			addToast({
				type: 'success',
				message: `Entry created successfully${result.isPinned ? ' and pinned' : ''}`
			});

			showCreateModal = false;
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

	// Edit entry handlers
	function handleEditEntry(entry: Entry) {
		editingEntry = entry;
		showEditModal = true;
	}

	async function handleSaveEdit(data: {
		content: string;
		filename: string;
		to: string[];
		except: string[];
		sourcePath: string;
		destinationPath: string;
	}) {
		if (!editingEntry) return;

		const { content, filename, to, except, sourcePath, destinationPath } = data;

		updatingEntry = true;

		try {
			const needsRename = filename !== editingEntry.filename.replace('.md', '');
			const metadataHeader = generateMetadataHeader(to, except, sourcePath, destinationPath);
			const contentToSave = metadataHeader + content;

			await updateEntry(editingEntry.filename, contentToSave, editingEntry.isPinned);

			if (needsRename) {
				await renameEntry(editingEntry.filename, filename, editingEntry.isPinned);
			}

			addToast({
				type: 'success',
				message: needsRename
					? 'Entry updated and renamed successfully'
					: 'Entry updated successfully'
			});

			showEditModal = false;
			editingEntry = null;
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

	// Delete entry handlers
	function handleDeleteEntry(entry: Entry) {
		editingEntry = entry;
		showDeleteModal = true;
	}

	async function handleConfirmDelete() {
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
	async function handleTogglePin(entry: Entry) {
		try {
			await toggleEntryPin(entry.filename, entry.isPinned);

			addToast({
				type: 'success',
				message: `Entry ${entry.isPinned ? 'unpinned' : 'pinned'} successfully`
			});

			await loadEntries();
		} catch (err) {
			addToast({
				type: 'error',
				message: err instanceof Error ? err.message : 'Failed to toggle pin status'
			});
		}
	}

	// Toggle entry expansion
	function handleToggleEntry(filename: string) {
		if (expandedEntries.has(filename)) {
			expandedEntries.delete(filename);
		} else {
			expandedEntries.add(filename);
		}
		expandedEntries = expandedEntries; // Trigger reactivity
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
						<EntryCard
							{entry}
							isPinned={true}
							isExpanded={expandedEntries.has(entry.filename)}
							ontoggle={() => handleToggleEntry(entry.filename)}
							onedit={() => handleEditEntry(entry)}
							ontogglepin={() => handleTogglePin(entry)}
							ondelete={() => handleDeleteEntry(entry)}
						/>
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
						<EntryCard
							{entry}
							isPinned={false}
							isExpanded={expandedEntries.has(entry.filename)}
							ontoggle={() => handleToggleEntry(entry.filename)}
							onedit={() => handleEditEntry(entry)}
							ontogglepin={() => handleTogglePin(entry)}
							ondelete={() => handleDeleteEntry(entry)}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modals -->
<CreateEntryModal
	bind:isOpen={showCreateModal}
	{peers}
	creating={creatingEntry}
	onclose={() => (showCreateModal = false)}
	onsubmit={handleCreateEntry}
/>

<EditEntryModal
	bind:isOpen={showEditModal}
	{peers}
	entry={editingEntry}
	updating={updatingEntry}
	onclose={() => (showEditModal = false)}
	onsubmit={handleSaveEdit}
/>

<DeleteEntryModal
	bind:isOpen={showDeleteModal}
	entry={editingEntry}
	deleting={deletingEntry}
	onclose={() => (showDeleteModal = false)}
	onconfirm={handleConfirmDelete}
/>
