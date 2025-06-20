import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface EnvSettings {
	PUBLIC_KEY: string;
	SECRET_KEY: string;
}

const envFilePath = path.join(process.cwd(), 'hinter-core-data', '.env');

async function ensureEnvDirectoryAndFile(): Promise<void> {
	// Only create directory and file when we actually need to write
	const dir = path.dirname(envFilePath);
	await fs.mkdir(dir, { recursive: true });

	// Check if .env file exists, if not create it
	try {
		await fs.access(envFilePath);
	} catch {
		await fs.writeFile(envFilePath, 'PUBLIC_KEY=\nSECRET_KEY=\n');
	}
}

async function readEnvFile(): Promise<EnvSettings> {
	const settings: EnvSettings = {
		PUBLIC_KEY: '',
		SECRET_KEY: ''
	};

	try {
		// Check if file exists without creating it
		await fs.access(envFilePath);
		const content = await fs.readFile(envFilePath, 'utf-8');
		const lines = content.split('\n');

		for (const line of lines) {
			const [key, value] = line.split('=');
			if (key && value !== undefined) {
				if (key === 'PUBLIC_KEY') {
					settings.PUBLIC_KEY = value;
				} else if (key === 'SECRET_KEY') {
					settings.SECRET_KEY = value;
				}
			}
		}
	} catch {
		// File doesn't exist, return empty settings without creating anything
		console.log('Environment file does not exist, returning empty settings');
	}

	return settings;
}

async function writeEnvFile(settings: EnvSettings): Promise<void> {
	// Ensure directory and file exist before writing
	await ensureEnvDirectoryAndFile();
	const content = `PUBLIC_KEY=${settings.PUBLIC_KEY}\nSECRET_KEY=${settings.SECRET_KEY}\n`;
	await fs.writeFile(envFilePath, content);
}

export const GET: RequestHandler = async () => {
	try {
		// Don't auto-create folder, just read if it exists
		const settings = await readEnvFile();
		return json(settings);
	} catch (error) {
		console.error('Error reading env file:', error);
		return json({ error: 'Failed to read settings' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const settings: EnvSettings = await request.json();
		// This will create the folder/file if needed when user manually saves
		await writeEnvFile(settings);
		return json({ success: true });
	} catch (error) {
		console.error('Error writing env file:', error);
		return json({ error: 'Failed to update settings' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action } = await request.json();

		if (action === 'initialize') {
			console.log('Starting Docker initialization...');

			// Check if hinter-core-data directory exists and is not empty
			const hinterCoreDataDir = path.join(process.cwd(), 'hinter-core-data');
			try {
				const files = await fs.readdir(hinterCoreDataDir);
				if (files.length > 0) {
					return json(
						{
							error:
								'Directory hinter-core-data already exists and is not empty. Please remove it first or use manual key entry.',
							details:
								'Docker initialization requires an empty or non-existent hinter-core-data directory'
						},
						{ status: 400 }
					);
				}
			} catch {
				// Directory doesn't exist, which is fine for initialization
			}

			// Build the Docker command (remove -it flags for non-TTY environment)
			const dockerCommand = `docker run --rm -v"$(pwd)/hinter-core-data":/app/hinter-core-data bbenligiray/hinter-core:latest npm run initialize`;

			// Execute the Docker command
			const { stdout, stderr } = await execAsync(dockerCommand, {
				cwd: process.cwd(),
				timeout: 120000 // 2 minute timeout
			});

			console.log('Docker initialization completed');
			console.log('stdout:', stdout);
			if (stderr) {
				console.log('stderr:', stderr);
			}

			// After initialization, read the newly generated settings
			const settings = await readEnvFile();

			return json({
				success: true,
				message: 'Environment initialized successfully',
				settings,
				output: stdout
			});
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (error) {
		console.error('Error during initialization:', error);
		return json(
			{
				error: 'Failed to initialize environment',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
