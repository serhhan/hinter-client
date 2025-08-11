<script lang="ts">
	import { page } from '$app/state';
	import { peers, loadPeers } from '$lib/stores/peer-store';
	import { getPeerOutgoing, getPeerIncoming } from '$lib/services/peer-service';
	import { afterNavigate } from '$app/navigation';
	import MarkdownRenderer from '../../../components/MarkdownRenderer.svelte';
	import Avatar from '../../../components/Avatar.svelte';
	import { addToast } from '$lib/stores/toast-store';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import EditPeerModal from '../../../components/EditPeerModal.svelte';

	// File interface for API data
	interface FileData {
		filename: string;
		content: string;
		size?: number;
		folderPath?: string;
		isRead?: boolean;
		timestamp?: Date;
		isFolder?: boolean;
	}

	// Tree node interface for folder hierarchy
	interface TreeNode {
		name: string;
		fullPath: string;
		children: Record<string, TreeNode>;
		files: FileData[];
		isFolder?: boolean;
		unreadCount?: number;
	}

	// Get the publicKey from URL params and decode it
	let publicKey = page.params.publicKey ? decodeURIComponent(page.params.publicKey) : '';

	// Update publicKey after navigation
	afterNavigate((navigation) => {
		if (navigation.to?.params?.publicKey) {
			publicKey = decodeURIComponent(navigation.to.params.publicKey);
			if (peer && browser) {
				loadFiles();
			}
		}
	});

	// Find the peer with matching publicKey
	const peer = $derived($peers.find((p) => p.publicKey === publicKey));

	// Modal state
	let showEditModal = $state(false);

	// File data - expecting arrays of file objects with name, content, size, etc.
	let outgoingFiles: FileData[] = $state([]);

	let incomingFiles: FileData[] = $state([]);

	let activeTab = $state<'outgoing' | 'incoming'>('incoming');
	let loading = $state(false);
	let loadedTabs = { outgoing: false, incoming: false };
	let pollInterval: NodeJS.Timeout | null = null;

	// File expansion tracking - using reactive object instead of Set for better Svelte 5 compatibility
	let expandedFiles = $state<Record<string, boolean>>({});
	// Folder expansion tracking - multiple folders can be expanded in hierarchy
	let expandedFolders = $state<Record<string, boolean>>({});

	// Tab switching
	async function switchTab(tab: 'outgoing' | 'incoming') {
		activeTab = tab;

		// Reset expansions when switching tabs
		expandedFolders = {};
		expandedFiles = {};

		// Only load if this tab hasn't been loaded yet
		if (!loadedTabs[tab] && peer && !loading) {
			await loadTabData(tab);
		}
	}

	// Load data for specific tab
	async function loadTabData(tab: 'outgoing' | 'incoming') {
		if (!publicKey || !peer) {
			return;
		}

		loading = true;

		try {
			if (tab === 'outgoing') {
				const data = await getPeerOutgoing(peer.alias, publicKey);
				outgoingFiles = data;
				loadedTabs.outgoing = true;
			} else {
				const data = await getPeerIncoming(peer.alias, publicKey);
				incomingFiles = data;
				loadedTabs.incoming = true;
			}
		} catch (error) {
			console.error(`Error loading ${tab} files:`, error);
			addToast({
				type: 'error',
				message: `Failed to load ${tab} files`
			});
		} finally {
			loading = false;
		}
	}

	// Load files for the current tab
	async function loadFiles() {
		if (!publicKey || !peer) {
			return;
		}

		// Load only the current tab's data
		await loadTabData(activeTab);
	}

	// Get the current tab's files
	const currentFiles = $derived(activeTab === 'outgoing' ? outgoingFiles : incomingFiles);

	// Build hierarchical folder tree from API data
	const folderTree = $derived(() => {
		const root: TreeNode = {
			name: 'root',
			fullPath: '',
			children: {},
			files: []
		};

		// Separate folders and files from API response
		const folders: Array<any> = [];
		const files: Array<any> = [];

		currentFiles.forEach((item) => {
			if (item.isFolder) {
				folders.push(item);
			} else {
				files.push(item);
			}
		});

		// Build folder structure first
		folders.forEach((folder) => {
			const pathSegments = folder.folderPath
				? [folder.folderPath, folder.filename]
				: [folder.filename];
			let currentNode = root;

			pathSegments.forEach((segment: string, index: number) => {
				const fullPath = pathSegments.slice(0, index + 1).join('/');

				if (!currentNode.children[segment]) {
					currentNode.children[segment] = {
						name: segment,
						fullPath: fullPath,
						children: {},
						files: [],
						isFolder: true
					};
				}
				currentNode = currentNode.children[segment];
			});
		});

		// Add files to appropriate folders
		files.forEach((file) => {
			if (!file.folderPath) {
				// Root level file
				root.files.push(file);
				return;
			}

			// Navigate to the correct folder
			const pathSegments = file.folderPath.split('/').filter((segment: string) => segment.trim());
			let currentNode = root;

			pathSegments.forEach((segment: string) => {
				if (currentNode.children[segment]) {
					currentNode = currentNode.children[segment];
				}
			});

			// Add file to this folder
			currentNode.files.push(file);
		});

		// Calculate unread counts for folders
		function calculateUnreadCount(node: TreeNode): number {
			let unreadCount = 0;

			// Count unread files in this folder
			unreadCount += node.files.filter((f) => !f.isRead).length;

			// Count unread files in subfolders
			Object.values(node.children).forEach((child) => {
				const childUnread = calculateUnreadCount(child);
				child.unreadCount = childUnread;
				unreadCount += childUnread;
			});

			return unreadCount;
		}

		calculateUnreadCount(root);

		return root;
	});

	// For backwards compatibility, also provide simple folder grouping
	const filesByFolder = $derived(
		currentFiles.reduce(
			(acc, file) => {
				if (file.isFolder) return acc; // Skip folder entries for now
				const folderKey = file.folderPath || 'root';
				if (!acc[folderKey]) {
					acc[folderKey] = [];
				}
				acc[folderKey].push(file);
				return acc;
			},
			{} as Record<string, typeof currentFiles>
		)
	);

	// Folder expansion toggle - nested hierarchy support
	function toggleFolder(folderPath: string) {
		if (expandedFolders[folderPath]) {
			// Close this folder and all its subfolders
			const keysToRemove = Object.keys(expandedFolders).filter(
				(key) => key === folderPath || key.startsWith(folderPath + '/')
			);
			keysToRemove.forEach((key) => {
				expandedFolders[key] = false;
			});
		} else {
			// Open this folder (keep parent folders open if it's a nested folder)
			expandedFolders[folderPath] = true;

			// Also ensure parent folders are open for nested paths
			const parts = folderPath.split('/');
			for (let i = 1; i < parts.length; i++) {
				const parentPath = parts.slice(0, i).join('/');
				expandedFolders[parentPath] = true;
			}
		}
	}

	// File expansion toggle within expanded folder
	async function toggleFile(file: any) {
		const fileKey = file.folderPath ? `${file.folderPath}/${file.filename}` : file.filename;

		if (expandedFiles[fileKey]) {
			expandedFiles[fileKey] = false;
		} else {
			expandedFiles[fileKey] = true;

			// Mark file as read when expanded (only for incoming files)
			if (activeTab === 'incoming' && file.isRead === false && peer) {
				try {
					const relativePath = file.folderPath
						? `${file.folderPath}/${file.filename}`
						: file.filename;
					const response = await fetch('/api/messages/mark-read', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							alias: peer.alias,
							publicKey: peer.publicKey,
							filepath: relativePath
						})
					});

					if (response.ok) {
						// Update the file's read status in current data
						file.isRead = true;
						// Reload peers to update count
						loadPeers(false);
					}
				} catch (error) {
					console.error('Failed to mark file as read:', error);
				}
			}
		}
	}

	// Modal functions
	function openEditModal() {
		showEditModal = true;
	}

	function handlePeerUpdated() {
		loadPeers(false);
		showEditModal = false;
		// If public key changed, we might need to navigate to new URL
		// The modal handles this automatically
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
		}
	});
</script>

<div class="h-full w-full overflow-y-auto rounded-l-md bg-white p-6">
	{#if peer}
		<div class="mb-8 flex items-center gap-4">
			<Avatar seed={peer.publicKey} alt={peer.alias} size="lg" style="notionists-neutral" />
			<div class="flex-1">
				<div class="flex items-center justify-between">
					<div>
						<h1 class="text-2xl font-bold text-gray-900">{peer.alias}</h1>
						<div class="flex items-center gap-2">
							<p class="font-mono text-sm text-gray-600">
								{peer.publicKey.slice(0, 16)}...{peer.publicKey.slice(-16)}
							</p>
							<button
								onclick={() => copyToClipboard(peer.publicKey)}
								aria-label="Copy public key"
								class="text-gray-500 hover:text-gray-700"
								title="Copy full public key"
							>
								<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
									<path
										d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
									/>
								</svg>
							</button>
						</div>

						<!-- Groups Display -->
						{#if peer.groups && peer.groups.length > 0}
							<div class="mt-3">
								<p class="mb-2 text-sm font-medium text-gray-700">Groups:</p>
								<div class="flex flex-wrap gap-1">
									{#each peer.groups as group}
										<span
											class="inline-flex items-center rounded-full {group === 'all'
												? 'bg-gray-200 text-gray-600'
												: 'bg-blue-100 text-blue-800'} px-2.5 py-1 text-sm font-medium"
										>
											{group}{group === 'all' ? ' (system)' : ''}
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>

					<!-- Edit Button -->
					<button
						onclick={openEditModal}
						class="flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						title="Edit peer"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
							/>
						</svg>
						Edit
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
					onclick={() => switchTab('incoming')}
				>
					Incoming ({peer.incomingCount})
				</button>
				<button
					class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'outgoing'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}"
					onclick={() => switchTab('outgoing')}
				>
					Outgoing ({peer.outgoingCount})
				</button>
			</nav>
		</div>

		<!-- File Content -->
		<div class="space-y-4">
			{#if loading}
				<div class="flex items-center justify-center py-8">
					<div class="text-gray-500">Loading files...</div>
				</div>
			{:else if currentFiles.length === 0}
				<div class="py-8 text-center text-gray-500">
					No {activeTab} files found.
				</div>
			{:else}
				<!-- Render root-level files first -->
				{#if folderTree().files.length > 0}
					<div class="mb-4">
						{#each folderTree().files as file}
							{@const fileKey = file.folderPath
								? `${file.folderPath}/${file.filename}`
								: file.filename}
							{@const isFileExpanded = expandedFiles[fileKey] || false}

							<button
								onclick={() => toggleFile(file)}
								class="file-item mb-2 flex w-full items-start space-x-3 rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:bg-gray-50"
							>
								<div class="flex items-center">
									<!-- File Icon -->
									<svg
										class="h-5 w-5 text-gray-400"
										fill="currentColor"
										viewBox="0 0 20 20"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											fill-rule="evenodd"
											d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
											clip-rule="evenodd"
										/>
									</svg>
									<div>
										<div class="flex items-center gap-2 font-medium text-gray-900">
											{formatTimestamp(file.filename)}
											{#if file.isRead === false}
												<span class="h-2 w-2 rounded-full bg-blue-500" title="Unread"></span>
											{/if}
										</div>
										<div class="text-sm text-gray-500">
											{file.filename}
											{#if file.size}
												• {getFileSize(file)}
											{/if}
											{#if file.isRead === false}
												<span class="ml-1 font-medium text-blue-600">• New</span>
											{/if}
										</div>
									</div>
								</div>
							</button>

							{#if isFileExpanded}
								<div class="file-content mt-2 mb-4 ml-8">
									<MarkdownRenderer markdownContent={file.content} />
								</div>
							{/if}
						{/each}
					</div>
				{/if}

				<!-- Render folders -->
				{#each Object.entries(folderTree().children) as [folderName, folderNode]}
					{@const isFolderExpanded = expandedFolders[folderName] || false}
					{@const typedFolderNode = folderNode as TreeNode}

					<!-- Folder Header -->
					<div class="mb-2 rounded-lg border border-gray-200 bg-white">
						<button
							class="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50"
							onclick={() => toggleFolder(folderName)}
						>
							<div class="flex items-center space-x-3">
								<div class="text-gray-400">
									{#if isFolderExpanded}
										<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
												clip-rule="evenodd"
											/>
										</svg>
									{:else}
										<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
												clip-rule="evenodd"
											/>
										</svg>
									{/if}
								</div>
								<div class="flex items-center space-x-2">
									<svg class="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
										<path
											d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
										/>
									</svg>
									<div>
										<div class="font-medium text-gray-900">{folderName}</div>
										<div class="flex items-center gap-2 text-sm text-gray-500">
											{typedFolderNode.files.length} file{typedFolderNode.files.length !== 1
												? 's'
												: ''}
											{#if typedFolderNode.files.filter((f: FileData) => f.isRead === false).length > 0}
												{@const unreadInFolder = typedFolderNode.files.filter(
													(f: FileData) => f.isRead === false
												).length}
												<span
													class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
												>
													{unreadInFolder} new
												</span>
											{/if}
											{#if typedFolderNode.unreadCount && typedFolderNode.unreadCount > 0}
												<span
													class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
												>
													{typedFolderNode.unreadCount} in subfolders
												</span>
											{/if}
										</div>
									</div>
								</div>
							</div>
						</button>
					</div>

					<!-- Content within folder (show if folder is expanded) -->
					{#if isFolderExpanded}
						<div class="mb-4 ml-6">
							<!-- Render subfolders first -->
							{#each Object.entries(typedFolderNode.children) as [subFolderName, subFolderNode]}
								{@const subTypedFolderNode = subFolderNode as TreeNode}
								{@const isSubFolderExpanded =
									expandedFolders[`${folderName}/${subFolderName}`] || false}

								<!-- Subfolder Header -->
								<div class="mb-2 rounded-lg border border-gray-200 bg-gray-50">
									<button
										class="flex w-full items-center justify-between p-3 text-left hover:bg-gray-100"
										onclick={() => toggleFolder(`${folderName}/${subFolderName}`)}
									>
										<div class="flex items-center space-x-3">
											<div class="text-gray-400">
												{#if isSubFolderExpanded}
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else}
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
											</div>
											<div class="flex items-center space-x-2">
												<svg
													class="h-4 w-4 text-orange-500"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
													/>
												</svg>
												<div>
													<div class="text-sm font-medium text-gray-900">{subFolderName}</div>
													<div class="flex items-center gap-2 text-xs text-gray-500">
														{subTypedFolderNode.files.length} file{subTypedFolderNode.files
															.length !== 1
															? 's'
															: ''}
														{#if subTypedFolderNode.files.filter((f: FileData) => f.isRead === false).length > 0}
															{@const unreadInSubFolder = subTypedFolderNode.files.filter(
																(f: FileData) => f.isRead === false
															).length}
															<span
																class="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800"
															>
																{unreadInSubFolder} new
															</span>
														{/if}
													</div>
												</div>
											</div>
										</div>
									</button>
								</div>

								<!-- Subfolder Files -->
								{#if isSubFolderExpanded}
									<div class="mb-4 ml-8">
										{#each subTypedFolderNode.files as subFile}
											{@const subFileKey = subFile.folderPath
												? `${subFile.folderPath}/${subFile.filename}`
												: subFile.filename}
											{@const isSubFileExpanded = expandedFiles[subFileKey] || false}

											<button
												onclick={() => toggleFile(subFile)}
												class="file-item mb-2 flex w-full items-start space-x-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50"
											>
												<div class="flex items-center">
													<!-- File Icon -->
													<svg
														class="h-4 w-4 text-gray-400"
														fill="currentColor"
														viewBox="0 0 20 20"
														xmlns="http://www.w3.org/2000/svg"
													>
														<path
															fill-rule="evenodd"
															d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
															clip-rule="evenodd"
														/>
													</svg>
													<div>
														<div class="flex items-center gap-2 text-sm font-medium text-gray-900">
															{formatTimestamp(subFile.filename)}
															{#if subFile.isRead === false}
																<span class="h-1.5 w-1.5 rounded-full bg-blue-500" title="Unread"
																></span>
															{/if}
														</div>
														<div class="text-xs text-gray-500">
															{subFile.filename}
															{#if subFile.size}
																• {getFileSize(subFile)}
															{/if}
															{#if subFile.isRead === false}
																<span class="ml-1 font-medium text-blue-600">• New</span>
															{/if}
														</div>
													</div>
												</div>
											</button>

											{#if isSubFileExpanded}
												<div class="file-content mt-2 mb-4 ml-8">
													<MarkdownRenderer markdownContent={subFile.content} />
												</div>
											{/if}
										{/each}
									</div>
								{/if}
							{/each}

							<!-- Then render files -->
							{#each typedFolderNode.files as file}
								{@const fileKey = file.folderPath
									? `${file.folderPath}/${file.filename}`
									: file.filename}
								{@const isFileExpanded = expandedFiles[fileKey] || false}

								<div class="mb-2 rounded-lg border border-gray-200 bg-white">
									<button
										class="flex w-full items-center justify-between p-3 text-left hover:bg-gray-50"
										onclick={() => toggleFile(file)}
									>
										<div class="flex items-center space-x-3">
											<div class="text-gray-400">
												{#if isFileExpanded}
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
															clip-rule="evenodd"
														/>
													</svg>
												{:else}
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
															clip-rule="evenodd"
														/>
													</svg>
												{/if}
											</div>
											<div class="flex items-center space-x-2">
												<svg class="h-4 w-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
													<path
														fill-rule="evenodd"
														d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
														clip-rule="evenodd"
													/>
												</svg>
												<div>
													<div class="flex items-center gap-2 font-medium text-gray-900">
														{formatTimestamp(file.filename)}
														{#if file.isRead === false}
															<span class="h-2 w-2 rounded-full bg-blue-500" title="Unread"></span>
														{/if}
													</div>
													<div class="text-sm text-gray-500">
														{file.filename}
														{#if file.size}
															• {getFileSize(file)}
														{/if}
														{#if file.isRead === false}
															<span class="ml-1 font-medium text-blue-600">• New</span>
														{/if}
													</div>
												</div>
											</div>
										</div>
									</button>

									{#if isFileExpanded}
										<div class="border-t border-gray-200 p-4">
											<div class="prose max-w-none text-sm">
												<MarkdownRenderer markdownContent={file.content} />
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				{/each}
			{/if}
		</div>
	{:else}
		<div class="flex h-full items-center justify-center">
			<div class="text-center">
				<p class="text-lg text-gray-500">Checking configuration...</p>
			</div>
		</div>
	{/if}
</div>

<!-- Edit Peer Modal -->
<EditPeerModal
	bind:isOpen={showEditModal}
	{peer}
	onClose={() => (showEditModal = false)}
	onPeerUpdated={handlePeerUpdated}
/>
