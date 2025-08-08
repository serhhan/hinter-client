<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { addToast } from '$lib/stores/toast-store.js';
	import {
		getDockerStatus,
		startDockerContainer,
		stopDockerContainer,
		type DockerContainerInfo
	} from '$lib/services/settings-service.js';
	import EntriesIcon from '../assets/EntriesIcon.svelte';
	import PeersIcon from '../assets/PeersIcon.svelte';
	import GroupsIcon from '../assets/GroupsIcon.svelte';
	import SettingsIcon from '../assets/SettingsIcon.svelte';
	import PowerIcon from '../assets/PowerIcon.svelte';

	// Docker state
	let dockerInfo: DockerContainerInfo = { isRunning: false };
	let isDockerLoading = false;
	let isDockerActionInProgress = false;

	onMount(() => {
		// Load Docker status on mount
		loadDockerStatus();

		// Check status every 30 seconds
		const interval = setInterval(loadDockerStatus, 30000);

		// Cleanup interval on destroy
		return () => clearInterval(interval);
	});

	async function loadDockerStatus() {
		isDockerLoading = true;
		try {
			dockerInfo = await getDockerStatus();
		} catch (error) {
			console.error('Error loading Docker status:', error);
			dockerInfo = { isRunning: false, error: 'Failed to load Docker status' };
		} finally {
			isDockerLoading = false;
		}
	}

	async function toggleDockerContainer() {
		if (isDockerActionInProgress) return;

		isDockerActionInProgress = true;
		try {
			if (dockerInfo.isRunning) {
				const result = await stopDockerContainer();
				addToast({ message: result.message, type: 'success' });
			} else {
				const result = await startDockerContainer();
				addToast({ message: result.message, type: 'success' });
			}
			await loadDockerStatus();
		} catch (error) {
			console.error('Error toggling Docker container:', error);
			addToast({
				message: error instanceof Error ? error.message : 'Failed to toggle Docker container',
				type: 'error'
			});
		} finally {
			isDockerActionInProgress = false;
		}
	}
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
			href="/groups"
			class="flex h-10 w-full items-center justify-center gap-2 text-gray-500 hover:text-gray-700 {page.url.pathname.includes(
				'/groups'
			)
				? 'bg-gray-200 text-gray-700'
				: ''}"><GroupsIcon /></a
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

	<!-- Docker Power Button -->
	<div class="mb-2 flex items-center justify-center">
		<button
			type="button"
			on:click={toggleDockerContainer}
			disabled={isDockerActionInProgress || isDockerLoading}
			class="group relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 {dockerInfo.isRunning
				? 'border-green-500 bg-green-500 hover:bg-green-600'
				: 'border-gray-300 bg-gray-100 hover:bg-gray-200'}"
			title={dockerInfo.isRunning ? 'Stop P2P Service' : 'Start P2P Service'}
		>
			{#if isDockerActionInProgress || isDockerLoading}
				<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
			{:else}
				<PowerIcon isActive={dockerInfo.isRunning} />
			{/if}

			<!-- Status Indicator Dot -->
			<div
				class="absolute -right-1 -bottom-1 h-3 w-3 rounded-full border-2 border-white {dockerInfo.isRunning
					? 'bg-green-500'
					: dockerInfo.error
						? 'bg-red-500'
						: 'bg-gray-400'}"
			></div>
		</button>
	</div>

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
