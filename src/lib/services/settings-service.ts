export interface EnvSettings {
	PUBLIC_KEY: string;
	SECRET_KEY: string;
}

export async function getSettings(): Promise<EnvSettings> {
	const response = await fetch('/api/settings');
	if (!response.ok) {
		throw new Error('Failed to fetch settings');
	}
	return response.json();
}

export async function updateSettings(settings: EnvSettings): Promise<void> {
	const response = await fetch('/api/settings', {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(settings)
	});

	if (!response.ok) {
		throw new Error('Failed to update settings');
	}
}

export interface InitializationResult {
	success: boolean;
	message: string;
	settings?: EnvSettings;
	output?: string;
	error?: string;
	details?: string;
}

export async function initializeEnvironment(): Promise<InitializationResult> {
	const response = await fetch('/api/settings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ action: 'initialize' })
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error(result.error || 'Failed to initialize environment');
	}

	return result;
}
