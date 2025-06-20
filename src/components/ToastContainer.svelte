<script lang="ts">
	import { toasts, removeToast, type Toast } from '$lib/stores/toast-store';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';

	function getToastStyles(type: Toast['type']) {
		switch (type) {
			case 'success':
				return 'bg-green-500 text-white';
			case 'error':
				return 'bg-red-500 text-white';
			case 'warning':
				return 'bg-yellow-500 text-black';
			case 'new-message':
				return 'bg-blue-600 text-white border-2 border-blue-400';
			default:
				return 'bg-gray-800 text-white';
		}
	}

	function getToastIcon(type: Toast['type']) {
		switch (type) {
			case 'success':
				return '✅';
			case 'error':
				return '❌';
			case 'warning':
				return '⚠️';
			case 'new-message':
				return '💬';
			default:
				return 'ℹ️';
		}
	}
</script>

<div class="pointer-events-none fixed top-4 right-4 z-50 space-y-2">
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg p-4 shadow-lg {getToastStyles(
				toast.type
			)}"
			transition:slide={{ duration: 300, easing: quintOut }}
		>
			<span class="flex-shrink-0 text-lg">{getToastIcon(toast.type)}</span>
			<span class="flex-1 text-sm font-medium">{toast.message}</span>
			<button
				class="ml-2 flex-shrink-0 text-lg leading-none hover:opacity-70"
				on:click={() => removeToast(toast.id)}
				aria-label="Close notification"
			>
				×
			</button>
		</div>
	{/each}
</div>
