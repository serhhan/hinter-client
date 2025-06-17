<script>
    import { page } from '$app/state';
	import EntriesIcon from '../assets/EntriesIcon.svelte';
	import PeersIcon from '../assets/PeersIcon.svelte';
</script>

<nav class="flex flex-col w-20 py-4 items-center bg-white rounded-md rounded-r-none border-r border-gray-200">
	<a href="/peers" class="flex items-center h-10 w-full justify-center gap-2 text-gray-500 hover:text-gray-700 {page.url.pathname.includes('/peers') ? 'text-gray-700 bg-gray-200' : ''}"><PeersIcon /></a>
	<a href="/entries" class="flex items-center h-10 w-full justify-center gap-2 text-gray-500 hover:text-gray-700 {page.url.pathname.includes('/entries') ? 'text-gray-700 bg-gray-200' : ''}"><EntriesIcon /></a>
</nav>
