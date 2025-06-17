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

<div class="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
	{#each $toasts as toast (toast.id)}
		<div
			class="pointer-events-auto max-w-sm p-4 rounded-lg shadow-lg flex items-center gap-3 {getToastStyles(toast.type)}"
			transition:slide={{ duration: 300, easing: quintOut }}
		>
			<span class="text-lg flex-shrink-0">{getToastIcon(toast.type)}</span>
			<span class="flex-1 text-sm font-medium">{toast.message}</span>
			<button
				class="flex-shrink-0 ml-2 hover:opacity-70 text-lg leading-none"
				on:click={() => removeToast(toast.id)}
				aria-label="Close notification"
			>
				×
			</button>
		</div>
	{/each}
</div> 