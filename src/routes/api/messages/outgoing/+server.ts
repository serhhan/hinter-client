import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOutgoingReports, createOutgoingReport } from '$lib/server/database';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const alias = url.searchParams.get('alias');
		const publicKey = url.searchParams.get('publicKey');

		// Validate required parameters
		if (!alias || !publicKey) {
			return json({ error: 'Missing required parameters: alias, publicKey' }, { status: 400 });
		}

		const reports = await getOutgoingReports(alias, publicKey);

		return json(reports);
	} catch (error) {
		console.error('Error fetching outgoing messages:', error);
		const message = error instanceof Error ? error.message : 'Failed to fetch outgoing messages';
		return json({ error: message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { alias, publicKey, content, suffix = '' } = await request.json();

		// Validate required parameters
		if (!alias || !publicKey || !content) {
			return json(
				{ error: 'Missing required parameters: alias, publicKey, content' },
				{ status: 400 }
			);
		}

		const filename = await createOutgoingReport(alias, publicKey, content, suffix);

		return json({
			message: 'Message created successfully',
			filename
		});
	} catch (error) {
		console.error('Error creating outgoing message:', error);
		const message = error instanceof Error ? error.message : 'Failed to create message';
		return json({ error: message }, { status: 500 });
	}
};
