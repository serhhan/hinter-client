export interface EnvSettings {
	PUBLIC_KEY: string;
	SECRET_KEY: string;
}

export interface InitializationResult {
	success: boolean;
	message: string;
	settings?: EnvSettings;
	output?: string;
	error?: string;
	details?: string;
}

export interface DockerContainerInfo {
	isRunning: boolean;
	containerId?: string;
	status?: string;
	uptime?: string;
	error?: string;
}

export interface DockerActionResult {
	success: boolean;
	message: string;
	error?: string;
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

export async function getDockerStatus(): Promise<DockerContainerInfo> {
	const response = await fetch('/api/settings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ action: 'docker-status' })
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error(result.error || 'Failed to get Docker status');
	}

	return result;
}

export async function startDockerContainer(): Promise<DockerActionResult> {
	const response = await fetch('/api/settings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ action: 'docker-start' })
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error(result.error || 'Failed to start Docker container');
	}

	return result;
}

export async function stopDockerContainer(): Promise<DockerActionResult> {
	const response = await fetch('/api/settings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ action: 'docker-stop' })
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error(result.error || 'Failed to stop Docker container');
	}

	return result;
}

export async function removeDockerContainer(): Promise<DockerActionResult> {
	const response = await fetch('/api/settings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ action: 'docker-remove' })
	});

	const result = await response.json();

	if (!response.ok) {
		throw new Error(result.error || 'Failed to remove Docker container');
	}

	return result;
}
