<script lang="ts">
	import type { Entry } from '$lib/types/entry';
	import { parseMetadata } from '$lib/utils/metadata-parser';
	import MarkdownRenderer from './MarkdownRenderer.svelte';
	import MetadataViewer from './MetadataViewer.svelte';
	import EditIcon from '../assets/EditIcon.svelte';
	import PinIcon from '../assets/PinIcon.svelte';
	import UnpinIcon from '../assets/UnpinIcon.svelte';
	import DeleteIcon from '../assets/DeleteIcon.svelte';
	import DocumentIcon from '../assets/DocumentIcon.svelte';
	import ChevronIcon from '../assets/ChevronIcon.svelte';

	interface Props {
		entry: Entry;
		isPinned?: boolean;
		isExpanded?: boolean;
		ontoggle?: () => void;
		onedit?: () => void;
		ontogglepin?: () => void;
		ondelete?: () => void;
	}

	let {
		entry,
		isPinned = false,
		isExpanded = false,
		ontoggle,
		onedit,
		ontogglepin,
		ondelete
	}: Props = $props();

	function formatTimestamp(timestamp: string | Date): string {
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		return date.toLocaleString();
	}

	function getFileSize(size: number): string {
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	}

	const metadata = $derived(parseMetadata(entry.content));
	const borderColor = $derived(isPinned ? 'border-yellow-300' : 'border-gray-200');
	const bgColor = $derived(isPinned ? 'bg-yellow-50' : '');
</script>

<div class="rounded-lg border {borderColor} {bgColor}">
	<div class="flex items-center justify-between p-4">
		<button
			class="flex flex-1 items-center gap-3 text-left hover:bg-gray-50"
			onclick={() => ontoggle?.()}
		>
			<DocumentIcon />
			<div class="flex flex-col">
				<span class="text-sm font-medium text-gray-900">{entry.filename}</span>
				<span class="text-xs text-gray-500">
					{formatTimestamp(entry.timestamp)} • {getFileSize(entry.size)}
				</span>
			</div>
			<div class="ml-auto transform transition-transform {isExpanded ? '' : 'rotate-180'}">
				<ChevronIcon />
			</div>
		</button>

		<!-- Action buttons -->
		<div class="ml-4 flex items-center gap-1">
			<button
				onclick={() => onedit?.()}
				class="rounded p-1 text-gray-500 hover:text-gray-700"
				class:hover:bg-yellow-100={isPinned}
				class:hover:bg-gray-100={!isPinned}
				title="Edit entry"
				aria-label="Edit entry"
			>
				<EditIcon />
			</button>
			<button
				onclick={() => ontogglepin?.()}
				class="rounded p-1 text-gray-500 hover:text-gray-700"
				class:hover:bg-yellow-100={isPinned}
				class:hover:bg-gray-100={!isPinned}
				title={isPinned ? 'Unpin entry' : 'Pin entry'}
				aria-label={isPinned ? 'Unpin entry' : 'Pin entry'}
			>
				{#if isPinned}
					<UnpinIcon />
				{:else}
					<PinIcon />
				{/if}
			</button>
			<button
				onclick={() => ondelete?.()}
				class="rounded p-1 text-red-500 hover:bg-red-100 hover:text-red-700"
				title="Delete entry"
				aria-label="Delete entry"
			>
				<DeleteIcon />
			</button>
		</div>
	</div>

	{#if isExpanded}
		<div
			class="border-t px-4 pb-4"
			class:border-yellow-200={isPinned}
			class:border-gray-100={!isPinned}
		>
			<MetadataViewer
				to={metadata.to}
				except={metadata.except}
				sourcePath={metadata.sourcePath}
				destinationPath={metadata.destinationPath}
			/>

			<div class="mt-2">
				<div class="prose prose-sm max-w-none rounded border bg-white p-4">
					<MarkdownRenderer markdownContent={metadata.cleanContent} />
				</div>
			</div>
		</div>
	{/if}
</div>
