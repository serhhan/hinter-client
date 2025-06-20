<script lang="ts">
	import '../app.css';
	import SideBar from '../components/SideBar.svelte';
	import ToastContainer from '../components/ToastContainer.svelte';
	import SettingsGuard from '../components/SettingsGuard.svelte';

	let { children } = $props();
</script>

<div class="flex h-screen bg-gray-100 p-8">
	<SideBar />
	<SettingsGuard>
		{@render children()}
	</SettingsGuard>
</div>

<ToastContainer />
