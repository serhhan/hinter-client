<script lang="ts">
	import { onMount } from 'svelte';
	import type { Peer } from '$lib/types/peer';

	export let peers: Peer[] = [];
	export let selectedPeers: string[] = [];
	export let excludedPeers: string[] = [];
	export let label: string;
	export let placeholder: string;
	export let id: string;
	export let variant: 'to' | 'except' = 'to';
	export let showGroups: boolean = true;

	let showDropdown = false;
	let groups: Array<{ name: string; peers: string[]; isSystemGroup: boolean }> = [];

	// Get available peers (excluding those in the other list)
	$: availablePeers = peers.filter((p) => !excludedPeers.includes(p.alias));

	// Get available groups (not including peers that are excluded)
	$: availableGroups = groups.filter((group) => {
		if (group.name === 'all') return true;
		return group.peers.some((peerAlias) => !excludedPeers.includes(peerAlias));
	});

	// Load groups on mount
	onMount(async () => {
		try {
			const response = await fetch('/api/groups');
			if (response.ok) {
				const data = await response.json();
				groups = data.groups;
			}
		} catch (error) {
			console.error('Failed to load groups:', error);
		}
	});

	// Toggle peer selection
	function togglePeer(peerAlias: string) {
		if (selectedPeers.includes(peerAlias)) {
			selectedPeers = selectedPeers.filter((p) => p !== peerAlias);
		} else {
			selectedPeers = [...selectedPeers, peerAlias];
		}
	}

	// Toggle group selection
	function toggleGroup(groupName: string) {
		const groupId = `group:${groupName}`;
		if (selectedPeers.includes(groupId)) {
			selectedPeers = selectedPeers.filter((p) => p !== groupId);
		} else {
			selectedPeers = [...selectedPeers, groupId];
		}
	}

	function selectAll() {
		selectedPeers = availablePeers.map((p) => p.alias);
	}

	function clearAll() {
		selectedPeers = [];
	}

	// Color schemes based on variant
	$: colorScheme =
		variant === 'to'
			? {
					buttonHover: 'hover:bg-blue-50',
					selectBtn: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
					icon: 'text-blue-600',
					iconBg: 'bg-blue-100'
				}
			: {
					buttonHover: 'hover:bg-red-50',
					selectBtn: 'bg-red-100 text-red-700 hover:bg-red-200',
					icon: 'text-red-600',
					iconBg: 'bg-red-100'
				};

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('.peer-dropdown-container')) {
			showDropdown = false;
		}
	}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="mb-4">
	<label for={id} class="mb-2 block text-sm font-medium text-gray-700">{label}</label>
	<div class="peer-dropdown-container relative">
		<button
			type="button"
			{id}
			onclick={() => (showDropdown = !showDropdown)}
			class="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pr-10 pl-3 text-left focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
		>
			<span class="block truncate text-sm">
				{#if selectedPeers.length === 0}
					{placeholder}
				{:else if selectedPeers.length === peers.length}
					All peers ({selectedPeers.length})
				{:else}
					{selectedPeers.length} peer{selectedPeers.length !== 1 ? 's' : ''}
					{variant === 'to' ? 'selected' : 'excluded'}
				{/if}
			</span>
			<span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
				<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 9l4-4 4 4m0 6l-4 4-4-4"
					></path>
				</svg>
			</span>
		</button>

		{#if showDropdown}
			<div
				class="ring-opacity-5 absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none"
			>
				<!-- Select All / Clear All buttons -->
				<div class="border-b border-gray-200 p-2">
					<div class="flex gap-2">
						<button
							type="button"
							onclick={selectAll}
							class="flex-1 rounded {colorScheme.selectBtn} px-2 py-1 text-xs"
						>
							{variant === 'to' ? 'Select All' : 'Exclude All'}
						</button>
						<button
							type="button"
							onclick={clearAll}
							class="flex-1 rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
						>
							Clear All
						</button>
					</div>
				</div>

				<!-- Groups Section -->
				{#if showGroups && availableGroups.length > 0}
					<div class="border-b border-gray-200 p-2">
						<div class="mb-2 text-xs font-medium text-gray-500">Groups</div>
						{#each availableGroups as group}
							<button
								type="button"
								onclick={() => toggleGroup(group.name)}
								class="relative w-full cursor-pointer py-1.5 pr-4 pl-8 text-left text-sm select-none {colorScheme.buttonHover} rounded"
							>
								{#if selectedPeers.includes(`group:${group.name}`)}
									<span class="absolute inset-y-0 left-0 flex items-center pl-2 {colorScheme.icon}">
										<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
												clip-rule="evenodd"
											></path>
										</svg>
									</span>
								{/if}
								<span class="flex items-center gap-2">
									<svg class="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
										<path
											d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"
										></path>
									</svg>
									<span class="font-medium">group:{group.name}</span>
									<span class="text-xs text-gray-500">({group.peers.length} peers)</span>
								</span>
							</button>
						{/each}
					</div>
				{/if}

				<!-- Individual Peers Section -->
				<div class="p-2">
					<div class="mb-2 text-xs font-medium text-gray-500">Individual Peers</div>
					{#each availablePeers as peer}
						<button
							type="button"
							onclick={() => togglePeer(peer.alias)}
							class="relative w-full cursor-pointer py-1.5 pr-4 pl-8 text-left text-sm select-none {colorScheme.buttonHover} rounded"
						>
							{#if selectedPeers.includes(peer.alias)}
								<span class="absolute inset-y-0 left-0 flex items-center pl-2 {colorScheme.icon}">
									<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										></path>
									</svg>
								</span>
							{/if}
							<span class="flex items-center gap-2">
								<svg class="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
									<path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"></path>
								</svg>
								<span class="font-normal">{peer.alias}</span>
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
	<p class="mt-1 text-xs text-gray-500">
		{variant === 'to' ? 'Selected' : 'Excluded'} peers: {selectedPeers.join(', ') || 'None'}
	</p>
</div>
