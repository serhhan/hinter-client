<script lang="ts">
	import { page } from '$app/state';
	import { peers } from '$lib/stores/peer-store';
	import { getPeerOutgoing, getPeerIncoming } from '$lib/services/peer-service';
	import { afterNavigate } from '$app/navigation';
	import MarkdownRenderer from '../../../components/MarkdownRenderer.svelte';
	import Avatar from '../../../components/Avatar.svelte';
	import { addToast } from '$lib/stores/toast-store';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	// Get the publicKey from URL params and decode it
	let publicKey = page.params.publicKey ? decodeURIComponent(page.params.publicKey) : '';

	// Update publicKey after navigation
	afterNavigate(() => {
		const newPublicKey = page.params.publicKey ? decodeURIComponent(page.params.publicKey) : '';
		if (newPublicKey !== publicKey) {
			publicKey = newPublicKey;
			// Reset state when navigating to new peer
			outgoingFiles = [];
			incomingFiles = [];
			expandedFiles = new Set<string>();
			error = null;
			loading = false;
			loadedTabs = { outgoing: false, incoming: false };
		}
	});

	// Find the peer with matching publicKey
	$: peer = $peers.find((p) => p.publicKey === publicKey);

	// File data - expecting arrays of file objects with name, content, size, etc.
	let outgoingFiles: Array<{ filename: string; content: string; timestamp: string; size: number }> =
		[];
	let incomingFiles: Array<{
		filename: string;
		content: string;
		timestamp: string;
		size: number;
		isRead?: boolean;
	}> = [];
	let loading = false;
	let error: string | null = null;
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	// Track which tabs have been loaded to distinguish between "not loaded" and "empty"
	let loadedTabs = {
		outgoing: false,
		incoming: false
	};

	// Tab state
	let activeTab: 'outgoing' | 'incoming' = 'outgoing'; // Default to outgoing

	// Get current files based on active tab
	$: currentFiles = activeTab === 'outgoing' ? outgoingFiles : incomingFiles;

	// Handle tab switching - load data if not already loaded
	async function switchTab(tab: 'outgoing' | 'incoming') {
		activeTab = tab;

		// Only load if this tab hasn't been loaded yet
		if (!loadedTabs[tab] && peer && !loading) {
			await loadTabData(tab);
		}
	}

	// Collapsed state for files - now tracks EXPANDED files instead of collapsed ones
	let expandedFiles = new Set<string>();

	// Load data for specific tab only
	async function loadTabData(tab: 'outgoing' | 'incoming') {
		if (!publicKey || !peer) {
			return;
		}

		loading = true;
		error = null;

		try {
			if (tab === 'outgoing') {
				const outgoing = await getPeerOutgoing(peer.alias, publicKey);
				if (peer.publicKey === publicKey) {
					outgoingFiles = outgoing;
					loadedTabs.outgoing = true;
				}
			} else {
				const incoming = await getPeerIncoming(peer.alias, publicKey);
				if (peer.publicKey === publicKey) {
					incomingFiles = incoming;
					loadedTabs.incoming = true;
				}
			}
		} catch (err) {
			if (peer && peer.publicKey === publicKey) {
				error = err instanceof Error ? err.message : 'Failed to load files';
			}
		} finally {
			loading = false;
		}
	}

	// Load initial files data for current tab
	async function loadFiles() {
		if (!publicKey || !peer) {
			return;
		}

		// Load only the current tab's data
		await loadTabData(activeTab);
	}

	// Reactive statement to load initial data when peer becomes available
	$: if (peer && publicKey && !loadedTabs[activeTab] && !loading) {
		// Use setTimeout to break the reactive cycle and prevent infinite loops
		setTimeout(() => {
			if (peer && publicKey && !loadedTabs[activeTab] && !loading) {
				loadTabData(activeTab);
			}
		}, 0);
	}

	async function toggleFile(filename: string) {
		if (expandedFiles.has(filename)) {
			expandedFiles.delete(filename);
		} else {
			expandedFiles.add(filename);

			// If this is an incoming file, mark it as read
			if (activeTab === 'incoming' && peer) {
				try {
					await fetch('/api/messages/mark-read', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							alias: peer.alias,
							publicKey: peer.publicKey,
							filename
						})
					});
					// Reload files to reflect the change
					await loadFiles();
				} catch (error) {
					console.error('Failed to mark message as read:', error);
				}
			}
		}
		expandedFiles = expandedFiles; // Trigger reactivity
	}

	// Copy to clipboard function
	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			addToast({
				type: 'success',
				message: 'Copied to clipboard!'
			});
		} catch (err) {
			console.error('Failed to copy: ', err);
		}
	}

	function formatTimestamp(filename: string) {
		// Extract timestamp from filename like "20250612154808.md"
		const match = filename.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\.md$/);
		if (match) {
			const [, year, month, day, hour, minute, second] = match;
			const date = new Date(
				parseInt(year),
				parseInt(month) - 1,
				parseInt(day),
				parseInt(hour),
				parseInt(minute),
				parseInt(second)
			);
			return date.toLocaleString();
		}
		return filename; // Fallback to filename if not in expected format
	}

	function getFileSize(file: { size?: number }) {
		if (file.size) {
			return file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`;
		}
		return '';
	}

	onMount(() => {
		if (browser) {
			loadFiles();

			// Start polling for file updates every 7 seconds (offset from PeerList)
			// Only poll the currently active tab to avoid unnecessary requests
			pollInterval = setInterval(async () => {
				if (peer && !loading) {
					await loadTabData(activeTab);
				}
			}, 7000);
		}
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	});
</script>

<div class="h-full w-full overflow-y-auto rounded-l-md bg-white p-6">
	{#if peer}
		<div class="mb-8 flex items-center gap-4">
			<Avatar seed={peer.publicKey} alt={peer.alias} size="lg" style="notionists-neutral" />
			<div>
				<h1 class="text-2xl font-bold text-gray-900">{peer.alias}</h1>
				<div class="flex items-center gap-2">
					<p class="font-mono text-sm text-gray-600">
						{peer.publicKey.slice(0, 8)}...{peer.publicKey.slice(-8)}
					</p>
					<button
						on:click={() => copyToClipboard(peer.publicKey)}
						aria-label="Copy public key"
						class="text-gray-500 hover:text-gray-700"
						title="Copy public key"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Connection Tabs -->
		<div class="mb-6 border-b border-gray-200">
			<nav class="-mb-px flex space-x-8">
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'incoming'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					on:click={() => switchTab('incoming')}
				>
					<div class="flex items-center gap-2">
						Received ({peer.incomingCount})
					</div>
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'outgoing'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					on:click={() => switchTab('outgoing')}
				>
					<div class="flex items-center gap-2">
						{#if loading && activeTab === 'outgoing'}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
							></div>
						{/if}
						Sent ({peer.outgoingCount})
					</div>
				</button>
			</nav>
		</div>

		<!-- Reports Section -->
		<div class="space-y-3">
			<h3 class="text-lg font-medium text-gray-900">
				{activeTab === 'outgoing' ? 'Sent' : 'Received'} Reports
			</h3>

			{#if loading}
				<div class="py-12 text-center">
					<div class="inline-flex items-center justify-center">
						<div
							class="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
						/>
					</div>
					<p class="mt-4 text-gray-500">Loading reports...</p>
				</div>
			{:else if error}
				<div class="py-8 text-center">
					<p class="text-red-500">Error: {error}</p>
				</div>
			{:else if !loadedTabs[activeTab]}
				<div class="py-8 text-center">
					<p class="text-gray-400">Click to load {activeTab} reports</p>
				</div>
			{:else if currentFiles.length === 0}
				<div class="py-8 text-center">
					<p class="text-gray-500">No {activeTab} reports found</p>
				</div>
			{:else}
				{#each currentFiles as file}
					<div
						class="rounded-lg border border-gray-200 {activeTab === 'incoming' &&
						!(file as any).isRead
							? 'border-blue-200 bg-blue-50'
							: ''}"
					>
						<button
							class="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
							on:click={() => toggleFile(file.filename)}
						>
							<div class="flex items-center gap-3">
								<svg
									width="16"
									height="16"
									viewBox="0 0 24 24"
									fill="currentColor"
									class="text-gray-500"
								>
									<path
										d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"
									/>
								</svg>
								<div class="flex flex-col">
									<div class="flex items-center gap-2">
										<span
											class="text-sm font-medium {activeTab === 'incoming' && !(file as any).isRead
												? 'text-blue-900'
												: ''}"
										>
											{file.filename}
										</span>
										{#if activeTab === 'incoming' && !(file as any).isRead}
											<div class="h-2 w-2 rounded-full bg-blue-600"></div>
										{/if}
									</div>
									<span class="text-xs text-gray-500">
										{formatTimestamp(file.filename)}
										{#if getFileSize(file)}
											• {getFileSize(file)}
										{/if}
									</span>
								</div>
							</div>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="currentColor"
								class="transform transition-transform {expandedFiles.has(file.filename)
									? ''
									: 'rotate-180'}"
							>
								<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
							</svg>
						</button>

						{#if expandedFiles.has(file.filename)}
							<div class="border-t border-gray-100 px-4 pb-4 text-sm text-gray-600">
								<div class="mt-2 space-y-2">
									{#if file.content}
										<div class="prose prose-sm max-w-none rounded border bg-white p-4">
											<MarkdownRenderer markdownContent={file.content} />
										</div>
									{:else}
										<div class="py-4 text-center">
											<p class="text-gray-400">No content available</p>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	{:else}
		<div class="py-8 text-center">
			<p class="text-gray-500">Peer not found</p>
		</div>
	{/if}
</div>
