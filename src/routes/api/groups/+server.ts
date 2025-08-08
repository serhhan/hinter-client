import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getGroups, getPeerConfig, updatePeerConfig } from '$lib/server/sync-engine';
import { getAllPeers } from '$lib/server/database';

// GET /api/groups - Get all groups
export const GET: RequestHandler = async () => {
	try {
		const groups = await getGroups();
		const groupsArray = Array.from(groups.entries()).map(([name, peers]) => ({
			name,
			peers,
			isSystemGroup: name === 'all'
		}));

		return json({ groups: groupsArray });
	} catch (error) {
		console.error('Error fetching groups:', error);
		return json({ error: 'Failed to fetch groups' }, { status: 500 });
	}
};

// POST /api/groups - Create a new group
export const POST: RequestHandler = async ({ request }) => {
	try {
		const { name, peerAliases } = await request.json();

		if (!name || !Array.isArray(peerAliases)) {
			return json({ error: 'Group name and peer aliases are required' }, { status: 400 });
		}

		if (name === 'all') {
			return json({ error: 'The group name "all" is reserved' }, { status: 400 });
		}

		// Validate slug format
		if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
			return json(
				{
					error: 'Invalid group name format. Use lowercase letters, numbers, and single hyphens.'
				},
				{ status: 400 }
			);
		}

		// Check if group already exists
		const existingGroups = await getGroups();
		if (existingGroups.has(name)) {
			return json({ error: 'A group with this name already exists' }, { status: 400 });
		}

		// Validate peer aliases
		const allPeers = await getAllPeers();
		const validAliases = allPeers.map((p) => p.alias);
		const invalidAliases = peerAliases.filter((alias: string) => !validAliases.includes(alias));

		if (invalidAliases.length > 0) {
			return json(
				{
					error: `Invalid peer aliases: ${invalidAliases.join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Add group to peer configurations
		for (const peerAlias of peerAliases) {
			const config = await getPeerConfig(peerAlias);
			config.groups = config.groups || [];

			if (!config.groups.includes(name)) {
				config.groups.push(name);
				await updatePeerConfig(peerAlias, config);
			}
		}

		return json({
			message: `Group "${name}" created successfully`,
			group: { name, peers: peerAliases }
		});
	} catch (error) {
		console.error('Error creating group:', error);
		const message = error instanceof Error ? error.message : 'Failed to create group';
		return json({ error: message }, { status: 500 });
	}
};
