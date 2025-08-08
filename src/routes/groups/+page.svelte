<script lang="ts">
	import { onMount } from 'svelte';
	import type { Peer } from '$lib/types/peer';
	import { peers, loadPeers } from '$lib/stores/peer-store';
	import PeerDropdown from '../../components/PeerDropdown.svelte';

	interface Group {
		name: string;
		peers: string[];
		isSystemGroup: boolean;
	}

	let groups: Group[] = [];
	let loading = true;
	let error: string | null = null;

	// Modal states
	let showCreateModal = false;
	let showEditModal = false;
	let showDeleteModal = false;
	let editingGroup: Group | null = null;
	let deletingGroup: Group | null = null;

	// Form states
	let newGroupName = '';
	let newGroupPeers: string[] = [];
	let editGroupPeers: string[] = [];
	let isSubmitting = false;

	// Expanded groups state
	let expandedGroups = new Set<string>();

	async function loadGroups() {
		try {
			const response = await fetch('/api/groups');
			if (response.ok) {
				const data = await response.json();
				groups = data.groups;
			} else {
				throw new Error('Failed to fetch groups');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load groups';
		}
	}

	async function createGroup() {
		if (!newGroupName.trim() || newGroupPeers.length === 0) return;

		isSubmitting = true;
		try {
			const response = await fetch('/api/groups', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newGroupName.trim(),
					peerAliases: newGroupPeers
				})
			});

			if (response.ok) {
				await loadGroups();
				closeCreateModal();
			} else {
				const errorData = await response.json();
				error = errorData.error || 'Failed to create group';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create group';
		} finally {
			isSubmitting = false;
		}
	}

	async function updateGroup() {
		if (!editingGroup) return;

		isSubmitting = true;
		try {
			const currentPeers = editingGroup.peers;
			const addPeers = editGroupPeers.filter((p) => !currentPeers.includes(p));
			const removePeers = currentPeers.filter((p) => !editGroupPeers.includes(p));

			const response = await fetch(`/api/groups/${editingGroup.name}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ addPeers, removePeers })
			});

			if (response.ok) {
				await loadGroups();
				closeEditModal();
			} else {
				const errorData = await response.json();
				error = errorData.error || 'Failed to update group';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update group';
		} finally {
			isSubmitting = false;
		}
	}

	async function deleteGroup() {
		if (!deletingGroup) return;

		isSubmitting = true;
		try {
			const response = await fetch(`/api/groups/${deletingGroup.name}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await loadGroups();
				closeDeleteModal();
			} else {
				const errorData = await response.json();
				error = errorData.error || 'Failed to delete group';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete group';
		} finally {
			isSubmitting = false;
		}
	}

	function openCreateModal() {
		newGroupName = '';
		newGroupPeers = [];
		showCreateModal = true;
	}

	function closeCreateModal() {
		showCreateModal = false;
		newGroupName = '';
		newGroupPeers = [];
	}

	function openEditModal(group: Group) {
		editingGroup = group;
		editGroupPeers = [...group.peers];
		showEditModal = true;
	}

	function closeEditModal() {
		showEditModal = false;
		editingGroup = null;
		editGroupPeers = [];
	}

	function openDeleteModal(group: Group) {
		deletingGroup = group;
		showDeleteModal = true;
	}

	function closeDeleteModal() {
		showDeleteModal = false;
		deletingGroup = null;
	}

	function toggleGroupExpansion(groupName: string) {
		if (expandedGroups.has(groupName)) {
			expandedGroups.delete(groupName);
		} else {
			expandedGroups.add(groupName);
		}
		expandedGroups = expandedGroups; // Trigger reactivity
	}

	onMount(async () => {
		await Promise.all([loadGroups(), loadPeers(false)]);
		loading = false;
	});
</script>

<svelte:head>
	<title>Groups - Hinter Client</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-l-md bg-white p-6">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Groups</h1>
			<p class="text-gray-600">Organize peers into groups for easier report distribution</p>
		</div>
		<button
			onclick={openCreateModal}
			class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
		>
			<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
				<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
			</svg>
			New Group
		</button>
	</div>

	{#if loading}
		<div class="py-12 text-center">
			<div class="inline-flex items-center justify-center">
				<svg class="h-8 w-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			</div>
			<p class="mt-4 text-gray-500">Loading groups...</p>
		</div>
	{:else if error}
		<div class="py-8 text-center">
			<p class="text-red-500">Error: {error}</p>
			<button
				onclick={() => {
					loadGroups();
					error = null;
				}}
				class="mt-2 text-blue-600 hover:text-blue-700"
			>
				Try again
			</button>
		</div>
	{:else if groups.length === 0}
		<div class="py-12 text-center">
			<svg
				class="mx-auto h-12 w-12 text-gray-400"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900">No groups</h3>
			<p class="mt-1 text-sm text-gray-500">Get started by creating a new group.</p>
			<button
				onclick={openCreateModal}
				class="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
					<path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
				</svg>
				New Group
			</button>
		</div>
	{:else}
		<!-- Groups Grid -->
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each groups as group}
				<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="rounded-full bg-blue-100 p-2">
								<svg class="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
									<path
										d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"
									></path>
								</svg>
							</div>
							<div>
								<h3 class="text-lg font-medium text-gray-900">{group.name}</h3>
								{#if group.isSystemGroup}
									<span class="text-xs text-gray-500">System Group</span>
								{/if}
							</div>
						</div>

						{#if !group.isSystemGroup}
							<div class="flex items-center gap-1">
								<button
									onclick={() => openEditModal(group)}
									class="rounded p-1 text-gray-400 hover:text-gray-600"
									title="Edit group"
									aria-label="Edit group"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
										/>
									</svg>
								</button>
								<button
									onclick={() => openDeleteModal(group)}
									class="rounded p-1 text-gray-400 hover:text-red-600"
									title="Delete group"
									aria-label="Delete group"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
								</button>
							</div>
						{/if}
					</div>

					<div class="mt-4">
						<p class="mb-2 text-sm text-gray-500">
							{group.peers.length} peer{group.peers.length !== 1 ? 's' : ''}
						</p>
						{#if group.peers.length > 0}
							{@const isExpanded = expandedGroups.has(group.name)}
							{@const peersToShow = isExpanded ? group.peers : group.peers.slice(0, 6)}

							<div class="flex flex-wrap gap-1">
								{#each peersToShow as peerAlias}
									<span
										class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
									>
										{peerAlias}
									</span>
								{/each}

								{#if group.peers.length > 6}
									<button
										onclick={() => toggleGroupExpansion(group.name)}
										class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
									>
										{#if isExpanded}
											Show less
										{:else}
											+{group.peers.length - 6} more
										{/if}
									</button>
								{/if}
							</div>
						{:else}
							<p class="text-sm text-gray-400">No peers assigned</p>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Group Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Create New Group</h3>
				<button
					onclick={closeCreateModal}
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

			<form
				onsubmit={(e) => {
					e.preventDefault();
					createGroup();
				}}
				class="space-y-4"
			>
				<div>
					<label for="groupName" class="block text-sm font-medium text-gray-700">Group Name</label>
					<input
						type="text"
						id="groupName"
						bind:value={newGroupName}
						class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						placeholder="e.g., ai-developers"
						required
					/>
					<p class="mt-1 text-xs text-gray-500">Use lowercase letters, numbers, and hyphens</p>
				</div>

				<PeerDropdown
					peers={$peers}
					bind:selectedPeers={newGroupPeers}
					excludedPeers={[]}
					label="Select Peers"
					placeholder="Choose peers for this group"
					id="create-group-peers"
					variant="to"
					showGroups={false}
				/>

				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={closeCreateModal}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting || !newGroupName.trim() || newGroupPeers.length === 0}
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
							Creating...
						{:else}
							Create Group
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Edit Group Modal -->
{#if showEditModal && editingGroup}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Edit Group: {editingGroup.name}</h3>
				<button
					onclick={closeEditModal}
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

			<form
				onsubmit={(e) => {
					e.preventDefault();
					updateGroup();
				}}
				class="space-y-4"
			>
				<PeerDropdown
					peers={$peers}
					bind:selectedPeers={editGroupPeers}
					excludedPeers={[]}
					label="Group Members"
					placeholder="Choose peers for this group"
					id="edit-group-peers"
					variant="to"
					showGroups={false}
				/>

				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={closeEditModal}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSubmitting}
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
							Update Group
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Group Modal -->
{#if showDeleteModal && deletingGroup}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">Delete Group</h3>
				<button
					onclick={closeDeleteModal}
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

			<div class="mb-6">
				<p class="text-sm text-gray-600">
					Are you sure you want to delete the group <strong>{deletingGroup.name}</strong>?
				</p>
				<p class="mt-2 text-sm text-red-600">This action cannot be undone.</p>
			</div>

			<div class="flex justify-end gap-3">
				<button
					type="button"
					onclick={closeDeleteModal}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={deleteGroup}
					disabled={isSubmitting}
					class="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
						Deleting...
					{:else}
						Delete Group
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
