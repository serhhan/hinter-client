import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getIncomingReports } from '$lib/server/database';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const alias = url.searchParams.get('alias');
		const publicKey = url.searchParams.get('publicKey');

		// Validate required parameters
		if (!alias || !publicKey) {
			return json({ error: 'Missing required parameters: alias, publicKey' }, { status: 400 });
		}

		const reports = await getIncomingReports(alias, publicKey);

		return json(reports);
	} catch (error) {
		console.error('Error fetching incoming messages:', error);
		const message = error instanceof Error ? error.message : 'Failed to fetch incoming messages';
		return json({ error: message }, { status: 500 });
	}
};
