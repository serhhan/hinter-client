import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removePeer, getIncomingReports, getOutgoingReports } from '$lib/server/database';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { alias, publicKey } = params;
		const type = url.searchParams.get('type'); // 'incoming' or 'outgoing'

		if (type === 'incoming') {
			const reports = await getIncomingReports(alias, publicKey);
			return json(reports);
		} else if (type === 'outgoing') {
			const reports = await getOutgoingReports(alias, publicKey);
			return json(reports);
		} else {
			return json({ error: 'Type parameter is required (incoming or outgoing)' }, { status: 400 });
		}
	} catch (error) {
		console.error('Error fetching peer messages:', error);
		return json({ error: 'Failed to fetch messages' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { alias, publicKey } = params;

		await removePeer(alias, publicKey);

		return json({ message: 'Peer removed successfully' });
	} catch (error) {
		console.error('Error removing peer:', error);
		return json({ error: 'Failed to remove peer' }, { status: 500 });
	}
};
