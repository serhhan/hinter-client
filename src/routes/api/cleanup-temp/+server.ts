import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { tempDir } = await request.json();

		if (!tempDir) {
			return json({ error: 'No temp directory provided' }, { status: 400 });
		}

		const fullTempPath = path.join(process.cwd(), 'hinter-core-data', tempDir);

		// Safety check: ensure we're only deleting temp directories
		if (!tempDir.startsWith('temp/')) {
			return json({ error: 'Invalid temp directory' }, { status: 400 });
		}

		try {
			await fs.rmdir(fullTempPath, { recursive: true });
			return json({ success: true });
		} catch (error) {
			console.warn('Failed to cleanup temp directory:', error);
			return json({ success: false, error: 'Cleanup failed' });
		}
	} catch (error) {
		console.error('Error in cleanup:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
