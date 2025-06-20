<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getSettings } from '$lib/services/settings-service.js';
	import { browser } from '$app/environment';

	let { children } = $props();
	let isChecking = $state(true);
	let settingsValid = $state(false);
	let isRedirecting = $state(false);
	let redirectCountdown = $state(3);

	// Make it reactive to page changes
	$effect(() => {
		if (!browser) {
			isChecking = false;
			return;
		}

		console.log('SettingsGuard: Page changed, checking settings for:', page.url.pathname);

		// If we're already on settings page, don't check - just show the page
		if (page.url.pathname.includes('/settings')) {
			console.log('SettingsGuard: Already on settings page, skipping check');
			isChecking = false;
			isRedirecting = false;
			settingsValid = true; // Assume valid to show settings page
			return;
		}

		// Reset state when checking
		isChecking = true;
		isRedirecting = false;
		redirectCountdown = 3;

		(async () => {
			try {
				const settings = await getSettings();
				settingsValid = !!(settings.PUBLIC_KEY && settings.SECRET_KEY);
				console.log('SettingsGuard: Settings check result:', {
					settings,
					settingsValid,
					currentPath: page.url.pathname
				});

				// If settings are not valid, show warning and countdown
				if (!settingsValid) {
					console.log('SettingsGuard: Settings invalid, starting redirect countdown');
					isChecking = false;
					isRedirecting = true;

					// Start countdown
					const countdownInterval = setInterval(() => {
						redirectCountdown--;
						if (redirectCountdown <= 0) {
							clearInterval(countdownInterval);
							console.log('SettingsGuard: Redirecting to settings page');
							goto('/settings', { replaceState: true });
						}
					}, 1000);

					return;
				}
			} catch (error) {
				console.error('Error checking settings:', error);
				// If there's an error, show warning and redirect
				console.log('SettingsGuard: Error occurred, starting redirect countdown');
				isChecking = false;
				isRedirecting = true;

				// Start countdown
				const countdownInterval = setInterval(() => {
					redirectCountdown--;
					if (redirectCountdown <= 0) {
						clearInterval(countdownInterval);
						console.log('SettingsGuard: Redirecting to settings page');
						goto('/settings', { replaceState: true });
					}
				}, 1000);

				return;
			} finally {
				if (!isRedirecting) {
					isChecking = false;
				}
			}
		})();
	});
</script>

{#if isChecking}
	<div class="flex flex-1 items-center justify-center">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900"
			></div>
			<p class="text-gray-600">Checking configuration...</p>
		</div>
	</div>
{:else if isRedirecting}
	<div class="flex flex-1 items-center justify-center">
		<div class="max-w-md text-center">
			<h3 class="mb-2 text-lg font-semibold text-gray-900">Invalid Environment Configuration</h3>
			<p class="mb-4 text-gray-600">
				You do not have valid environment configurations. Redirecting to settings page in <span
					class="font-bold text-red-600">{redirectCountdown}</span
				> seconds...
			</p>
			<div class="h-2 w-full rounded-full bg-gray-200">
				<div
					class="h-2 rounded-full bg-red-600 transition-all duration-1000 ease-linear"
					style="width: {((3 - redirectCountdown) / 3) * 100}%"
				></div>
			</div>
		</div>
	</div>
{:else}
	{@render children()}
{/if}
