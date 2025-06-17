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

export const removeEntry = async (entry: Entry) => {
	const response = await fetch('/api/entries', {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(entry)
	});

	if (!response.ok) {
		throw new Error('Failed to remove entry');
	}
	return response.json();
};
