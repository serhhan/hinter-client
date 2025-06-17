import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { markMessageAsRead } from '$lib/server/database';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { alias, publicKey, filename } = await request.json();

		// Validate required parameters
		if (!alias || !publicKey || !filename) {
			return json(
				{ error: 'Missing required parameters: alias, publicKey, filename' },
				{ status: 400 }
			);
		}

		await markMessageAsRead(alias, publicKey, filename);

		return json({
			success: true,
			message: `${filename} marked as read for ${alias}`
		});
	} catch (error) {
		console.error('Error marking message as read:', error);
		const message = error instanceof Error ? error.message : 'Failed to mark message as read';
		return json({ error: message }, { status: 500 });
	}
};
