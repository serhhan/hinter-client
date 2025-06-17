<script lang="ts">
	import type { Peer } from '$lib/types/peer';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import Avatar from './Avatar.svelte';

	export let peer: Peer;

	let currentPath = page.url.pathname;

	// Update current path after navigation
	afterNavigate(() => {
		currentPath = page.url.pathname;
	});

	// Check if this peer is currently selected based on the route
	$: expectedPath = `/peers/${encodeURIComponent(peer.publicKey)}`;
	$: isSelected = currentPath === expectedPath;

	// Get unread count from peer object
	$: unreadCount = peer.unreadCount || 0;
</script>

<a href={`/peers/${encodeURIComponent(peer.publicKey)}`}>
	<div
		class="flex w-full cursor-pointer items-center gap-2 {isSelected
			? 'border-l-4 border-blue-500 bg-blue-100'
			: 'hover:bg-gray-100'}"
	>
		<div class="flex w-full items-center gap-2 p-2">
			<div class="relative flex-shrink-0">
				<Avatar seed={peer.publicKey} alt={peer.alias} size="sm" style="notionists-neutral" />
				{#if unreadCount > 0}
					<div
						class={`absolute -right-2 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-red-500 text-xs text-white ${isSelected ? 'border-blue-100' : 'border-white'} z-10`}
					>
						<span class="m-auto">{unreadCount}</span>
					</div>
				{/if}
			</div>
			<div class="ml-1 flex w-full flex-col">
				<div class="flex w-full items-center justify-between gap-2">
					<h3 class="truncate text-sm {isSelected ? 'font-medium text-blue-800' : ''}">
						{peer.alias}
					</h3>
				</div>
				<div class="flex items-center gap-2 text-xs">
					<div class="flex flex-row items-center gap-1 text-blue-600">
						<span>Received: {peer.incomingCount}</span>
					</div>
					<div class="flex items-center gap-1 text-green-600">
						<span>Sent:{peer.outgoingCount}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</a>
