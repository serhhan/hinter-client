<script lang="ts">
	import type { Peer } from '$lib/types/peer';
	import {
		analyzePeerConfig,
		calculatePeerNetworkStats,
		formatPeerInfo
	} from '$lib/utils/peer-config-utils';

	export let peers: Peer[] = [];
	export let collapsed: boolean = true;

	$: peerConfig = analyzePeerConfig(peers);
	$: networkStats = calculatePeerNetworkStats(peers);

	function toggleCollapse() {
		collapsed = !collapsed;
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4">
	<button
		on:click={toggleCollapse}
		class="flex w-full items-center justify-between text-left"
		aria-expanded={!collapsed}
	>
		<h3 class="text-sm font-medium text-gray-900">Network Statistics</h3>
		<svg
			class="h-4 w-4 transform transition-transform {collapsed ? 'rotate-0' : 'rotate-180'}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if !collapsed}
		<div class="mt-4 space-y-4">
			<!-- Overview Stats -->
			<div class="grid grid-cols-2 gap-4">
				<div class="rounded-md bg-blue-50 p-3">
					<div class="text-lg font-semibold text-blue-900">{peerConfig.totalPeers}</div>
					<div class="text-xs text-blue-600">Total Peers</div>
				</div>
				<div class="rounded-md bg-green-50 p-3">
					<div class="text-lg font-semibold text-green-900">{peerConfig.activeGroups.length}</div>
					<div class="text-xs text-green-600">Active Groups</div>
				</div>
				<div class="rounded-md bg-purple-50 p-3">
					<div class="text-lg font-semibold text-purple-900">{networkStats.totalMessages}</div>
					<div class="text-xs text-purple-600">Total Messages</div>
				</div>
				<div class="rounded-md bg-orange-50 p-3">
					<div class="text-lg font-semibold text-orange-900">{networkStats.totalUnread}</div>
					<div class="text-xs text-orange-600">Unread Messages</div>
				</div>
			</div>

			<!-- Group Coverage -->
			<div>
				<div class="mb-2 flex items-center justify-between">
					<span class="text-xs font-medium text-gray-700">Group Coverage</span>
					<span class="text-xs text-gray-500">{peerConfig.groupCoverage.toFixed(1)}%</span>
				</div>
				<div class="h-2 w-full rounded-full bg-gray-200">
					<div
						class="h-2 rounded-full bg-blue-600 transition-all duration-300"
						style="width: {peerConfig.groupCoverage}%"
					></div>
				</div>
				<div class="mt-1 text-xs text-gray-500">
					{peerConfig.totalPeers - peerConfig.unassignedPeers.length} of {peerConfig.totalPeers} peers
					in custom groups
				</div>
			</div>

			<!-- Most Active -->
			{#if networkStats.mostActiveReceiver || networkStats.mostActiveSender}
				<div class="border-t pt-4">
					<h4 class="mb-2 text-xs font-medium text-gray-700">Most Active</h4>
					<div class="space-y-1 text-xs">
						{#if networkStats.mostActiveReceiver}
							<div class="flex justify-between">
								<span class="text-gray-600">Receiver:</span>
								<span class="font-medium"
									>{networkStats.mostActiveReceiver.alias} ({networkStats.mostActiveReceiver
										.incomingCount})</span
								>
							</div>
						{/if}
						{#if networkStats.mostActiveSender}
							<div class="flex justify-between">
								<span class="text-gray-600">Sender:</span>
								<span class="font-medium"
									>{networkStats.mostActiveSender.alias} ({networkStats.mostActiveSender
										.outgoingCount})</span
								>
							</div>
						{/if}
						<div class="flex justify-between">
							<span class="text-gray-600">Avg per peer:</span>
							<span class="font-medium">{networkStats.averageMessagesPerPeer.toFixed(1)}</span>
						</div>
					</div>
				</div>
			{/if}

			<!-- Unassigned Peers Warning -->
			{#if peerConfig.unassignedPeers.length > 0}
				<div class="rounded-md border border-amber-200 bg-amber-50 p-3">
					<div class="flex">
						<svg class="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
						<div class="ml-2">
							<h5 class="text-xs font-medium text-amber-800">Unassigned Peers</h5>
							<p class="text-xs text-amber-700">
								{peerConfig.unassignedPeers.length} peer{peerConfig.unassignedPeers.length === 1
									? ''
									: 's'} only in "all" group
							</p>
							<div class="mt-1 text-xs text-amber-600">
								{peerConfig.unassignedPeers.join(', ')}
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Groups Breakdown -->
			{#if peerConfig.activeGroups.length > 1}
				<div class="border-t pt-4">
					<h4 class="mb-2 text-xs font-medium text-gray-700">Groups</h4>
					<div class="space-y-1">
						{#each peerConfig.activeGroups as group}
							<div class="flex justify-between text-xs">
								<span class="text-gray-600">{group}:</span>
								<span class="font-medium"
									>{peerConfig.peersByGroup[group]?.length || 0} peer{(peerConfig.peersByGroup[
										group
									]?.length || 0) === 1
										? ''
										: 's'}</span
								>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
