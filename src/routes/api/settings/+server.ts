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

interface DockerContainerInfo {
	isRunning: boolean;
	containerId?: string;
	status?: string;
	uptime?: string;
	error?: string;
}

const envFilePath = path.join(process.cwd(), 'hinter-core-data', '.env');
const CONTAINER_NAME = 'my-hinter-core';

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

async function getDockerContainerStatus(): Promise<DockerContainerInfo> {
	try {
		// Check if container exists and get its status
		const { stdout } = await execAsync(
			`docker ps -a --filter name=${CONTAINER_NAME} --format "{{.ID}} {{.Status}} {{.RunningFor}}"`
		);

		if (!stdout.trim()) {
			return { isRunning: false, error: 'Container not found' };
		}

		const [containerId, ...statusParts] = stdout.trim().split(' ');
		const statusString = statusParts.join(' ');
		const isRunning = statusString.toLowerCase().includes('up');

		return {
			isRunning,
			containerId,
			status: statusString,
			uptime: isRunning ? statusString : undefined
		};
	} catch (error) {
		console.error('Error checking Docker container status:', error);
		return {
			isRunning: false,
			error: error instanceof Error ? error.message : 'Failed to check container status'
		};
	}
}

async function startDockerContainer(): Promise<{
	success: boolean;
	message: string;
	error?: string;
}> {
	try {
		// Check if container already exists
		const status = await getDockerContainerStatus();

		if (status.isRunning) {
			return { success: true, message: 'Container is already running' };
		}

		if (status.containerId && !status.isRunning) {
			// Container exists but is stopped, start it
			console.log('Starting existing container...');
			await execAsync(`docker start ${CONTAINER_NAME}`);
			return { success: true, message: 'Container started successfully' };
		}

		// Container doesn't exist, create and start it
		console.log('Creating and starting new container...');
		const dockerCommand = `docker run -d --name ${CONTAINER_NAME} --restart=always --network host -v"$(pwd)/hinter-core-data":/app/hinter-core-data bbenligiray/hinter-core:latest`;

		const { stdout } = await execAsync(dockerCommand, {
			cwd: process.cwd(),
			timeout: 60000 // 1 minute timeout
		});

		console.log('Container created with ID:', stdout.trim());
		return { success: true, message: 'Container created and started successfully' };
	} catch (error) {
		console.error('Error starting Docker container:', error);
		return {
			success: false,
			message: 'Failed to start container',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

async function stopDockerContainer(): Promise<{
	success: boolean;
	message: string;
	error?: string;
}> {
	try {
		const status = await getDockerContainerStatus();

		if (!status.containerId) {
			return { success: true, message: 'Container not found' };
		}

		if (!status.isRunning) {
			return { success: true, message: 'Container is already stopped' };
		}

		console.log('Stopping container...');
		await execAsync(`docker stop ${CONTAINER_NAME}`);
		return { success: true, message: 'Container stopped successfully' };
	} catch (error) {
		console.error('Error stopping Docker container:', error);
		return {
			success: false,
			message: 'Failed to stop container',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}

async function removeDockerContainer(): Promise<{
	success: boolean;
	message: string;
	error?: string;
}> {
	try {
		const status = await getDockerContainerStatus();

		if (!status.containerId) {
			return { success: true, message: 'Container not found' };
		}

		// Stop first if running
		if (status.isRunning) {
			await execAsync(`docker stop ${CONTAINER_NAME}`);
		}

		console.log('Removing container...');
		await execAsync(`docker rm ${CONTAINER_NAME}`);
		return { success: true, message: 'Container removed successfully' };
	} catch (error) {
		console.error('Error removing Docker container:', error);
		return {
			success: false,
			message: 'Failed to remove container',
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
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

			// After successful initialization, read the generated settings
			const settings = await readEnvFile();

			return json({
				success: true,
				message: 'Environment initialized successfully',
				settings,
				output: stdout
			});
		} else if (action === 'docker-status') {
			const status = await getDockerContainerStatus();
			return json(status);
		} else if (action === 'docker-start') {
			const result = await startDockerContainer();
			return json(result);
		} else if (action === 'docker-stop') {
			const result = await stopDockerContainer();
			return json(result);
		} else if (action === 'docker-remove') {
			const result = await removeDockerContainer();
			return json(result);
		}

		return json({ error: 'Invalid action' }, { status: 400 });
	} catch (error) {
		console.error('Error during action:', error);
		return json(
			{
				error: 'Failed to execute action',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
