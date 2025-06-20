<script>
	import PeerList from '../../components/PeerList.svelte';

	let { children } = $props();
</script>

<div class="flex h-full w-full gap-4">
	<div class="w-80 flex-shrink-0">
		<PeerList />
	</div>
	{@render children()}
</div>
