<script lang="ts">
	export let to: string[] = [];
	export let except: string[] = [];
	export let sourcePath: string = '';
	export let destinationPath: string = '';

	// Only show metadata section if any fields have values
	$: hasMetadata = to.length > 0 || except.length > 0 || sourcePath || destinationPath;
</script>

{#if hasMetadata}
	<!-- Draft Report Metadata -->
	<div class="mt-3 mb-3 rounded-md bg-blue-50 p-3">
		<h4 class="mb-2 text-sm font-medium text-blue-900">📋 Draft Report Configuration</h4>
		<div class="grid grid-cols-1 gap-2 text-xs">
			{#if to.length > 0}
				<div class="flex flex-wrap items-center gap-1">
					<span class="font-medium text-blue-800">To:</span>
					{#each to as peer}
						<span
							class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
						>
							{peer}
						</span>
					{/each}
				</div>
			{/if}
			{#if except.length > 0}
				<div class="flex flex-wrap items-center gap-1">
					<span class="font-medium text-red-800">Except:</span>
					{#each except as peer}
						<span
							class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
						>
							{peer}
						</span>
					{/each}
				</div>
			{/if}
			{#if sourcePath}
				<div class="flex items-center gap-1">
					<span class="font-medium text-green-800">Source Path:</span>
					<code class="rounded bg-green-100 px-1 py-0.5 text-green-800">{sourcePath}</code>
				</div>
			{/if}
			{#if destinationPath}
				<div class="flex items-center gap-1">
					<span class="font-medium text-purple-800">Destination Path:</span>
					<code class="rounded bg-purple-100 px-1 py-0.5 text-purple-800">{destinationPath}</code>
				</div>
			{/if}
		</div>
	</div>
{/if}
