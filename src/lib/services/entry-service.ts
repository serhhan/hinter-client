import type { Entry } from '$lib/types/entry';

export const getEntries = async () => {
	const response = await fetch('/api/entries');
	if (!response.ok) {
		throw new Error('Failed to fetch entries');
	}
	return response.json();
};

export const addEntry = async (entry: Entry) => {
	const response = await fetch('/api/entries', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(entry)
	});

	if (!response.ok) {
		throw new Error('Failed to add entry');
	}
	return response.json();
};

export const updateEntry = async (filename: string, content: string, isPinned: boolean) => {
	const response = await fetch('/api/entries', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			action: 'update',
			filename,
			content,
			isPinned
		})
	});

	if (!response.ok) {
		throw new Error('Failed to update entry');
	}
	return response.json();
};

export const renameEntry = async (filename: string, newFilename: string, isPinned: boolean) => {
	const response = await fetch('/api/entries', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			action: 'rename',
			filename,
			newFilename,
			isPinned
		})
	});

	if (!response.ok) {
		throw new Error('Failed to rename entry');
	}
	return response.json();
};

export const toggleEntryPin = async (filename: string, isPinned: boolean) => {
	const response = await fetch('/api/entries', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			action: 'togglePin',
			filename,
			isPinned
		})
	});

	if (!response.ok) {
		throw new Error('Failed to toggle entry pin status');
	}
	return response.json();
};

export const removeEntry = async (filename: string, isPinned: boolean) => {
	const response = await fetch('/api/entries', {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			filename,
			isPinned
		})
	});

	if (!response.ok) {
		throw new Error('Failed to remove entry');
	}
	return response.json();
};
