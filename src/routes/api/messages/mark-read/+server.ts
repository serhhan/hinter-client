import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markMessageAsRead } from '$lib/server/database';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { alias, publicKey, filename, filepath } = await request.json();

		// Support both filename (legacy) and filepath (new folder-aware)
		const fileIdentifier = filepath || filename;

		// Validate required parameters
		if (!alias || !publicKey || !fileIdentifier) {
			return json(
				{ error: 'Missing required parameters: alias, publicKey, filepath/filename' },
				{ status: 400 }
			);
		}

		await markMessageAsRead(alias, publicKey, fileIdentifier);

		return json({
			success: true,
			message: `${fileIdentifier} marked as read for ${alias}`
		});
	} catch (error) {
		console.error('Error marking message as read:', error);
		const message = error instanceof Error ? error.message : 'Failed to mark message as read';
		return json({ error: message }, { status: 500 });
	}
};
