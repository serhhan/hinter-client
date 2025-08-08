import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroups, getPeerConfig, updatePeerConfig } from '$lib/server/sync-engine';
import { getAllPeers } from '$lib/server/database';

// PUT /api/groups/[groupName] - Update group membership
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { groupName } = params;
		const { addPeers = [], removePeers = [] } = await request.json();

		if (groupName === 'all') {
			return json({ error: 'Cannot modify the system "all" group' }, { status: 400 });
		}

		// Check if group exists
		const existingGroups = await getGroups();
		if (!existingGroups.has(groupName)) {
			return json({ error: 'Group not found' }, { status: 404 });
		}

		// Validate peer aliases
		const allPeers = await getAllPeers();
		const validAliases = allPeers.map((p) => p.alias);

		const invalidAddPeers = addPeers.filter((alias: string) => !validAliases.includes(alias));
		const invalidRemovePeers = removePeers.filter((alias: string) => !validAliases.includes(alias));

		if (invalidAddPeers.length > 0 || invalidRemovePeers.length > 0) {
			return json(
				{
					error: `Invalid peer aliases: ${[...invalidAddPeers, ...invalidRemovePeers].join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Remove peers from group
		for (const peerAlias of removePeers) {
			const config = await getPeerConfig(peerAlias);
			config.groups = config.groups || [];
			config.groups = config.groups.filter((g: string) => g !== groupName);
			await updatePeerConfig(peerAlias, config);
		}

		// Add peers to group
		for (const peerAlias of addPeers) {
			const config = await getPeerConfig(peerAlias);
			config.groups = config.groups || [];

			if (!config.groups.includes(groupName)) {
				config.groups.push(groupName);
				await updatePeerConfig(peerAlias, config);
			}
		}

		// Get updated group membership
		const updatedGroups = await getGroups();
		const groupPeers = updatedGroups.get(groupName) || [];

		return json({
			message: `Group "${groupName}" updated successfully`,
			group: { name: groupName, peers: groupPeers }
		});
	} catch (error) {
		console.error('Error updating group:', error);
		const message = error instanceof Error ? error.message : 'Failed to update group';
		return json({ error: message }, { status: 500 });
	}
};

// DELETE /api/groups/[groupName] - Delete a group
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { groupName } = params;

		if (groupName === 'all') {
			return json({ error: 'Cannot delete the system "all" group' }, { status: 400 });
		}

		// Check if group exists
		const existingGroups = await getGroups();
		if (!existingGroups.has(groupName)) {
			return json({ error: 'Group not found' }, { status: 404 });
		}

		// Remove group from all peer configurations
		const groupPeers = existingGroups.get(groupName) || [];
		for (const peerAlias of groupPeers) {
			const config = await getPeerConfig(peerAlias);
			config.groups = config.groups || [];
			config.groups = config.groups.filter((g: string) => g !== groupName);
			await updatePeerConfig(peerAlias, config);
		}

		return json({
			message: `Group "${groupName}" deleted successfully`
		});
	} catch (error) {
		console.error('Error deleting group:', error);
		const message = error instanceof Error ? error.message : 'Failed to delete group';
		return json({ error: message }, { status: 500 });
	}
};
