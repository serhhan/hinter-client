import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	message: string;
	type: 'info' | 'success' | 'warning' | 'error' | 'new-message';
	duration?: number; // in milliseconds
}

export const toasts = writable<Toast[]>([]);

let toastIdCounter = 0;

export function addToast(toast: Omit<Toast, 'id'>) {
	const id = `toast-${++toastIdCounter}`;
	const newToast: Toast = {
		...toast,
		id,
		duration: toast.duration ?? 4000 // Default 4 seconds
	};

	toasts.update((current) => [...current, newToast]);

	// Auto-remove toast after duration
	if (newToast.duration && newToast.duration > 0) {
		setTimeout(() => {
			removeToast(id);
		}, newToast.duration);
	}

	return id;
}

export function removeToast(id: string) {
	toasts.update((current) => current.filter((toast) => toast.id !== id));
}

export function clearAllToasts() {
	toasts.set([]);
}
