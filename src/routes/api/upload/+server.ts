import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs/promises';
import path from 'path';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const files = formData.getAll('files') as File[];

		if (files.length === 0) {
			return json({ error: 'No files provided' }, { status: 400 });
		}

		// Create temp directory for uploaded files
		const tempDir = path.join(process.cwd(), 'hinter-core-data', 'temp', Date.now().toString());
		await fs.mkdir(tempDir, { recursive: true });

		const uploadedFiles: string[] = [];

		// Save each file to temp directory
		for (const file of files) {
			if (file.size === 0) continue;

			const fileName = file.name;
			const filePath = path.join(tempDir, fileName);

			// Convert File to Buffer and save
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			await fs.writeFile(filePath, buffer);

			// Store relative path from hinter-core-data
			const relativePath = path.relative(path.join(process.cwd(), 'hinter-core-data'), filePath);
			uploadedFiles.push(relativePath);
		}

		return json({
			success: true,
			files: uploadedFiles,
			tempDir: path.relative(path.join(process.cwd(), 'hinter-core-data'), tempDir)
		});
	} catch (error) {
		console.error('Error uploading files:', error);
		return json({ error: 'Failed to upload files' }, { status: 500 });
	}
};
