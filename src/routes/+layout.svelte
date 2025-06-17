<script lang="ts">
	import '../app.css';
	import SideBar from '../components/SideBar.svelte';
	import ToastContainer from '../components/ToastContainer.svelte';

	let { children } = $props();
</script>

<div class="flex h-screen bg-gray-100 p-8">
	<SideBar />
	{@render children()}
</div>

<ToastContainer />
