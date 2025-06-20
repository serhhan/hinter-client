<script>
	import { page } from '$app/state';
	import EntriesIcon from '../assets/EntriesIcon.svelte';
	import PeersIcon from '../assets/PeersIcon.svelte';
	import SettingsIcon from '../assets/SettingsIcon.svelte';
</script>

<nav
	class="flex h-full w-20 flex-col rounded-md rounded-r-none border-r border-gray-200 bg-white py-4"
>
	<div class="flex flex-col items-center space-y-1">
		<a
			href="/peers"
			class="flex h-10 w-full items-center justify-center gap-2 text-gray-500 hover:text-gray-700 {page.url.pathname.includes(
				'/peers'
			)
				? 'bg-gray-200 text-gray-700'
				: ''}"><PeersIcon /></a
		>
		<a
			href="/entries"
			class="flex h-10 w-full items-center justify-center gap-2 text-gray-500 hover:text-gray-700 {page.url.pathname.includes(
				'/entries'
			)
				? 'bg-gray-200 text-gray-700'
				: ''}"><EntriesIcon /></a
		>
	</div>
	<div class="flex-1"></div>
	<div class="flex items-center justify-center">
		<a
			href="/settings"
			class="flex h-10 w-full items-center justify-center gap-2 text-gray-500 hover:text-gray-700 {page.url.pathname.includes(
				'/settings'
			)
				? 'bg-gray-200 text-gray-700'
				: ''}"><SettingsIcon /></a
		>
	</div>
</nav>
