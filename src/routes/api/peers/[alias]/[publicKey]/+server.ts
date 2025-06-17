import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { removePeer } from '$lib/server/database';

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
