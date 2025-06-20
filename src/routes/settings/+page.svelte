<script lang="ts">
	import { onMount } from 'svelte';
	import { addToast } from '$lib/stores/toast-store.js';
	import { getSettings, updateSettings, type EnvSettings } from '$lib/services/settings-service.js';
	import EyeIcon from '../../assets/EyeIcon.svelte';
	import EyeOffIcon from '../../assets/EyeOffIcon.svelte';
	import CopyIcon from '../../assets/CopyIcon.svelte';

	let settings: EnvSettings = { PUBLIC_KEY: '', SECRET_KEY: '' };
	let isLoading = true;
	let isSaving = false;
	let showSecretKey = false;
	let editedSettings: EnvSettings = { PUBLIC_KEY: '', SECRET_KEY: '' };

	onMount(async () => {
		try {
			settings = await getSettings();
			editedSettings = { ...settings };
		} catch (error) {
			console.error('Error loading settings:', error);
			addToast({ message: 'Failed to load settings', type: 'error' });
		} finally {
			isLoading = false;
		}
	});

	async function handleSubmit() {
		if (isSaving) return;

		try {
			isSaving = true;
			await updateSettings(editedSettings);
			settings = { ...editedSettings };
			addToast({ message: 'Settings saved successfully', type: 'success' });
		} catch (error) {
			console.error('Error saving settings:', error);
			addToast({ message: 'Failed to save settings', type: 'error' });
		} finally {
			isSaving = false;
		}
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			addToast({ message: 'Copied to clipboard', type: 'success' });
		} catch (error) {
			console.error('Failed to copy:', error);
			addToast({ message: 'Failed to copy to clipboard', type: 'error' });
		}
	}

	function toggleSecretKeyVisibility() {
		showSecretKey = !showSecretKey;
	}

	function resetForm() {
		editedSettings = { ...settings };
	}

	$: hasChanges =
		editedSettings.PUBLIC_KEY !== settings.PUBLIC_KEY ||
		editedSettings.SECRET_KEY !== settings.SECRET_KEY;
</script>

<div class="flex-1 p-6">
	<div class="mx-auto max-w-2xl">
		<div class="mb-8">
			<h1 class="mb-2 text-2xl font-bold text-gray-900">Settings</h1>
			<p class="text-gray-600">Manage your environment configuration</p>
		</div>

		{#if isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
			</div>
		{:else}
			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<!-- Public Key Section -->
				<div class="rounded-lg border border-gray-200 bg-white p-6">
					<div class="mb-4 flex items-center gap-2">
						<h2 class="text-lg font-medium text-gray-900">Public Key</h2>
						{#if editedSettings.PUBLIC_KEY}
							<button
								type="button"
								on:click={() => copyToClipboard(editedSettings.PUBLIC_KEY)}
								class="text-gray-500 transition-colors hover:text-gray-700"
								title="Copy public key"
							>
								<CopyIcon />
							</button>
						{/if}
					</div>
					<div class="space-y-2">
						<label for="public-key" class="block text-sm font-medium text-gray-700">
							Public Key
						</label>
						<input
							id="public-key"
							type="text"
							bind:value={editedSettings.PUBLIC_KEY}
							placeholder="Enter your public key"
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
						/>
						<p class="text-sm text-gray-500">
							Your public key that others will use to identify you
						</p>
					</div>
				</div>

				<!-- Secret Key Section -->
				<div class="rounded-lg border border-gray-200 bg-white p-6">
					<h2 class="mb-4 text-lg font-medium text-gray-900">Secret Key</h2>
					<div class="space-y-2">
						<label for="secret-key" class="block text-sm font-medium text-gray-700">
							Secret Key
						</label>
						<div class="relative">
							<input
								id="secret-key"
								type={showSecretKey ? 'text' : 'password'}
								bind:value={editedSettings.SECRET_KEY}
								placeholder="Enter your secret key"
								class="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none"
							/>
							<button
								type="button"
								on:click={toggleSecretKeyVisibility}
								class="absolute top-1/2 right-3 -translate-y-1/2 transform text-gray-500 transition-colors hover:text-gray-700"
								title={showSecretKey ? 'Hide secret key' : 'Show secret key'}
							>
								{#if showSecretKey}
									<EyeOffIcon />
								{:else}
									<EyeIcon />
								{/if}
							</button>
						</div>
						<p class="text-sm text-gray-500">
							Your private key used for encryption and authentication
						</p>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex items-center justify-between pt-4">
					<button
						type="button"
						on:click={resetForm}
						disabled={!hasChanges || isSaving}
						class="rounded-md border border-gray-300 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						Reset
					</button>
					<button
						type="submit"
						disabled={!hasChanges || isSaving}
						class="flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isSaving}
							<div class="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
						{/if}
						{isSaving ? 'Saving...' : 'Save Settings'}
					</button>
				</div>
			</form>

			{#if !editedSettings.PUBLIC_KEY || !editedSettings.SECRET_KEY}
				<div class="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-yellow-800">Configuration Required</h3>
							<div class="mt-2 text-sm text-yellow-700">
								<p>
									Please set both your public key and secret key to use the application.
									{#if !editedSettings.PUBLIC_KEY && !editedSettings.SECRET_KEY}
										Both keys are missing.
									{:else if !editedSettings.PUBLIC_KEY}
										Your public key is missing.
									{:else}
										Your secret key is missing.
									{/if}
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
