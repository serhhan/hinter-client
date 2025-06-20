import { json } from '@sveltejs/kit';
import fs from 'fs';

const ENV_FILE_PATH = 'hinter-core-data/.env';

function readEnvFile(): { PUBLIC_KEY: string; SECRET_KEY: string } {
	try {
		if (!fs.existsSync(ENV_FILE_PATH)) {
			return { PUBLIC_KEY: '', SECRET_KEY: '' };
		}

		const content = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
		const lines = content.split('\n');
		const env: { PUBLIC_KEY: string; SECRET_KEY: string } = { PUBLIC_KEY: '', SECRET_KEY: '' };

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('#')) {
				const [key, ...valueParts] = trimmed.split('=');
				const value = valueParts.join('=');
				if (key === 'PUBLIC_KEY') {
					env.PUBLIC_KEY = value;
				} else if (key === 'SECRET_KEY') {
					env.SECRET_KEY = value;
				}
			}
		}

		return env;
	} catch (error) {
		console.error('Error reading .env file:', error);
		return { PUBLIC_KEY: '', SECRET_KEY: '' };
	}
}

function writeEnvFile(env: { PUBLIC_KEY: string; SECRET_KEY: string }): void {
	try {
		const content = `PUBLIC_KEY=${env.PUBLIC_KEY}\nSECRET_KEY=${env.SECRET_KEY}\n`;
		fs.writeFileSync(ENV_FILE_PATH, content, 'utf-8');
	} catch (error) {
		console.error('Error writing .env file:', error);
		throw error;
	}
}

function ensureEnvFileExists(): void {
	if (!fs.existsSync(ENV_FILE_PATH)) {
		fs.writeFileSync(ENV_FILE_PATH, 'PUBLIC_KEY=\nSECRET_KEY=\n', 'utf-8');
	}
}

export async function GET() {
	try {
		ensureEnvFileExists();
		const env = readEnvFile();
		return json(env);
	} catch (error) {
		console.error('Error getting env variables:', error);
		return json({ error: 'Failed to read environment variables' }, { status: 500 });
	}
}

export async function PUT({ request }) {
	try {
		const { PUBLIC_KEY, SECRET_KEY } = await request.json();

		if (typeof PUBLIC_KEY !== 'string' || typeof SECRET_KEY !== 'string') {
			return json({ error: 'Invalid environment variables format' }, { status: 400 });
		}

		writeEnvFile({ PUBLIC_KEY, SECRET_KEY });

		return json({ success: true });
	} catch (error) {
		console.error('Error updating env variables:', error);
		return json({ error: 'Failed to update environment variables' }, { status: 500 });
	}
}
