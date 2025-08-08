import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllPeers, addPeer as addPeerToDB } from '$lib/server/database';

export const GET: RequestHandler = async () => {
	try {
		const peers = await getAllPeers();
		return json({ peers });
	} catch (error) {
		console.error('Error fetching peers:', error);
		return json({ error: 'Failed to fetch peers' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { alias, publicKey } = await request.json();

		await addPeerToDB(alias, publicKey);

		return json({
			message: 'Peer added successfully',
			alias,
			publicKey
		});
	} catch (error) {
		console.error('Error adding peer:', error);
		const message = error instanceof Error ? error.message : 'Failed to add peer';
		const status = message.includes('already exists') ? 400 : 500;
		return json({ error: message }, { status });
	}
};
