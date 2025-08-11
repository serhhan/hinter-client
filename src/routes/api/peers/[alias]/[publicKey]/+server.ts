import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	removePeer,
	getIncomingReports,
	getOutgoingReports,
	updatePeerAlias,
	updatePeerPublicKey
} from '$lib/server/database';

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

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { alias, publicKey } = params;
		const body = await request.json();

		if (body.newAlias) {
			// Update alias
			if (typeof body.newAlias !== 'string') {
				return json({ error: 'New alias must be a string' }, { status: 400 });
			}

			if (body.newAlias.includes('-')) {
				return json({ error: 'Alias cannot contain hyphens' }, { status: 400 });
			}

			await updatePeerAlias(alias, publicKey, body.newAlias.trim());
			return json({ message: 'Peer alias updated successfully', newAlias: body.newAlias.trim() });
		}

		if (body.newPublicKey) {
			// Update public key
			if (typeof body.newPublicKey !== 'string') {
				return json({ error: 'New public key must be a string' }, { status: 400 });
			}

			if (!/^[a-f0-9]{64}$/.test(body.newPublicKey)) {
				return json(
					{ error: 'Public key must be 64 lowercase hexadecimal characters' },
					{ status: 400 }
				);
			}

			await updatePeerPublicKey(alias, publicKey, body.newPublicKey.trim());
			return json({
				message: 'Public key updated successfully',
				newPublicKey: body.newPublicKey.trim()
			});
		}

		return json({ error: 'No valid update fields provided' }, { status: 400 });
	} catch (error) {
		console.error('Error updating peer:', error);
		const message = error instanceof Error ? error.message : 'Failed to update peer';
		const status = message.includes('already exists') ? 400 : 500;
		return json({ error: message }, { status });
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
