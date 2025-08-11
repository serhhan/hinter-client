import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAllEntries,
	createEntry,
	updateEntry,
	deleteEntry,
	renameEntry,
	toggleEntryPin
} from '$lib/server/database';
import { syncReports } from '$lib/server/sync-engine';

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
		const {
			content,
			suffix = '',
			isPinned = false,
			to = [],
			except = [],
			sourceFiles = [],
			destinationPath = ''
		} = await request.json();

		// Create metadata prefix for the content if draft report fields are provided
		let finalContent = content;
		if (to.length > 0 || except.length > 0 || sourceFiles.length > 0 || destinationPath) {
			const metadata = [];
			if (to.length > 0) metadata.push(`to: ${JSON.stringify(to)}`);
			if (except.length > 0) metadata.push(`except: ${JSON.stringify(except)}`);
			if (sourceFiles.length > 0) metadata.push(`sourceFiles: ${JSON.stringify(sourceFiles)}`);
			if (destinationPath) metadata.push(`destinationPath: '${destinationPath}'`);

			finalContent = `${metadata.join(' ')}\n\n${content}`;
		}

		const filename = await createEntry(finalContent, suffix, isPinned);

		// Auto-sync if entry has metadata (to, sourceFiles, etc.)
		if (to.length > 0 || except.length > 0 || sourceFiles.length > 0 || destinationPath) {
			try {
				await syncReports();
			} catch (syncError) {
				console.error('Auto-sync failed:', syncError);
				// Don't fail the entry creation if sync fails
			}
		}

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

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const { action, filename, content, newFilename, isPinned } = await request.json();

		if (action === 'update') {
			await updateEntry(filename, content, isPinned);
			return json({ message: 'Entry updated successfully' });
		} else if (action === 'rename') {
			await renameEntry(filename, newFilename, isPinned);
			return json({ message: 'Entry renamed successfully', newFilename });
		} else if (action === 'togglePin') {
			await toggleEntryPin(filename, isPinned);
			return json({ message: 'Entry pin status toggled successfully' });
		} else {
			return json({ error: 'Invalid action' }, { status: 400 });
		}
	} catch (error) {
		console.error('Error updating entry:', error);
		const message = error instanceof Error ? error.message : 'Failed to update entry';
		return json({ error: message }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const { filename, isPinned } = await request.json();

		await deleteEntry(filename, isPinned);

		return json({ message: 'Entry deleted successfully' });
	} catch (error) {
		console.error('Error deleting entry:', error);
		const message = error instanceof Error ? error.message : 'Failed to delete entry';
		return json({ error: message }, { status: 500 });
	}
};
