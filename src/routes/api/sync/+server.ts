import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { syncReports } from '$lib/server/sync-engine';

export const POST: RequestHandler = async () => {
	try {
		const result = await syncReports();

		return json({
			success: true,
			message: `Sync completed. Processed ${result.reportsProcessed} reports, updated ${result.reportsDistributed} files, removed ${result.reportsRemoved} obsolete files.`,
			result
		});
	} catch (error) {
		console.error('Sync error:', error);
		const message = error instanceof Error ? error.message : 'Failed to sync reports';
		return json({ error: message }, { status: 500 });
	}
};
