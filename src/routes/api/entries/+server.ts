import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllEntries, createEntry } from '$lib/server/database';

export const GET: RequestHandler = async () => {
	try {
		const entries = await getAllEntries();
		return json(entries);
	} catch (error) {
		console.error('Error fetching entries:', error);
		return json({ error: 'Failed to fetch entries' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { content, suffix = '', isPinned = false } = await request.json();

		const filename = await createEntry(content, suffix, isPinned);

		return json({
			message: 'Entry created successfully',
			filename,
			isPinned
		});
	} catch (error) {
		console.error('Error creating entry:', error);
		const message = error instanceof Error ? error.message : 'Failed to create entry';
		return json({ error: message }, { status: 500 });
	}
};
