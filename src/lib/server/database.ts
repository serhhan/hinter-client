import fs from 'fs/promises';
import path from 'path';
import { getPeerGroups } from './sync-engine';

// Types
export interface Peer {
	alias: string;
	publicKey: string;
	incomingCount: number;
	outgoingCount: number;
	unreadCount: number;
	groups: string[];
}

export interface Report {
	filename: string;
	content: string;
	timestamp: Date;
	size: number;
	isRead?: boolean;
	folderPath?: string;
	isFolder?: boolean;
	unreadCount?: number; // For folders, count of unread files within
}

export interface Entry {
	filename: string;
	content: string;
	timestamp: Date;
	size: number;
	isPinned: boolean;
}

export interface ReadStatus {
	[key: string]: boolean;
}

// Paths - relative to project root
function getDataDir() {
	return path.join(process.cwd(), 'hinter-core-data');
}

function getPeersDir() {
	return path.join(getDataDir(), 'peers');
}

function getEntriesDir() {
	return path.join(getDataDir(), 'entries');
}

function getReadStatusFile() {
	return path.join(getDataDir(), 'read_status.json');
}

// Utility function to ensure directory exists
export async function ensureDir(dirPath: string): Promise<void> {
	try {
		await fs.access(dirPath);
	} catch {
		await fs.mkdir(dirPath, { recursive: true });
	}
}

// Helper functions for centralized read status
export async function getReadStatus(): Promise<ReadStatus> {
	try {
		const exists = await fs
			.access(getReadStatusFile())
			.then(() => true)
			.catch(() => false);

		if (exists) {
			const content = await fs.readFile(getReadStatusFile(), 'utf8');
			if (!content.trim()) {
				return {};
			}
			return JSON.parse(content);
		}
	} catch (error) {
		console.warn('Error reading read status file:', error);
	}
	return {};
}

export async function saveReadStatus(readStatus: ReadStatus): Promise<void> {
	try {
		await ensureDir(getDataDir());
		await fs.writeFile(getReadStatusFile(), JSON.stringify(readStatus, null, 2));
	} catch (error) {
		console.error('Error saving read status file:', error);
	}
}

export function getFileKey(alias: string, publicKey: string, filepath: string): string {
	return `${alias}-${publicKey}:incoming:${filepath}`;
}

// Get all peers
export async function getAllPeers(): Promise<Peer[]> {
	try {
		const peerDirs = await fs.readdir(getPeersDir(), { withFileTypes: true });
		const peers: Peer[] = [];

		for (const dir of peerDirs) {
			if (dir.isDirectory()) {
				const alias = dir.name;

				// Read the hinter.config.json to get the publicKey
				const configPath = path.join(getPeersDir(), dir.name, 'hinter.config.json');
				let publicKey = '';

				try {
					const configContent = await fs.readFile(configPath, 'utf8');
					const config = JSON.parse(configContent);
					publicKey = config.publicKey;
				} catch (error) {
					console.warn(`Could not read config for peer ${alias}:`, error);
					continue; // Skip this peer if config is invalid
				}

				const incomingDir = path.join(getPeersDir(), dir.name, 'incoming');
				const outgoingDir = path.join(getPeersDir(), dir.name, 'outgoing');

				let incomingCount = 0;
				let outgoingCount = 0;
				let unreadCount = 0;

				try {
					const readStatus = await getReadStatus();
					const fileList: string[] = [];
					await collectMdFilesRecursively(incomingDir, '', fileList);

					incomingCount = fileList.length;
					unreadCount = fileList.filter((filePath) => {
						const fileKey = getFileKey(alias, publicKey, filePath);
						return !readStatus[fileKey];
					}).length;
				} catch (error) {
					// Directory doesn't exist or is inaccessible - counts remain 0
					if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
						console.warn(
							`Unexpected error reading incoming directory for ${alias}:`,
							error.message
						);
					}
				}

				try {
					const outgoingFiles = await fs.readdir(outgoingDir);
					outgoingCount = outgoingFiles.filter((f) => f.endsWith('.md')).length;
				} catch (error) {
					// Directory doesn't exist or is inaccessible - count remains 0
					if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
						console.warn(
							`Unexpected error reading outgoing directory for ${alias}:`,
							error.message
						);
					}
				}

				// Get groups for this peer
				const groups = await getPeerGroups(alias);

				peers.push({
					alias,
					publicKey,
					incomingCount,
					outgoingCount,
					unreadCount,
					groups
				});
			}
		}

		return peers;
	} catch (error) {
		console.error('Error getting peers:', error);
		return [];
	}
}

// Add new peer
export async function addPeer(alias: string, publicKey: string): Promise<void> {
	if (!alias || !publicKey) {
		throw new Error('Alias and public key are required');
	}

	if (!/^[a-f0-9]{64}$/.test(publicKey)) {
		throw new Error('Public key must be 64 lowercase hexadecimal characters');
	}

	const peerDir = path.join(getPeersDir(), alias);
	const incomingDir = path.join(peerDir, 'incoming');
	const outgoingDir = path.join(peerDir, 'outgoing');
	const configPath = path.join(peerDir, 'hinter.config.json');

	try {
		await fs.access(peerDir);
		throw new Error('Peer already exists');
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
			throw error;
		}
	}

	await ensureDir(incomingDir);
	await ensureDir(outgoingDir);

	// Create the config file with the publicKey
	const config = { publicKey };
	await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// Update peer alias
export async function updatePeerAlias(
	oldAlias: string,
	publicKey: string,
	newAlias: string
): Promise<void> {
	const oldPeerDir = path.join(getPeersDir(), oldAlias);
	const newPeerDir = path.join(getPeersDir(), newAlias);

	// Check if old peer exists
	try {
		await fs.access(oldPeerDir);
	} catch {
		throw new Error(`Peer with alias "${oldAlias}" not found`);
	}

	// Check if new alias already exists
	try {
		await fs.access(newPeerDir);
		throw new Error(`Peer with alias "${newAlias}" already exists`);
	} catch (error) {
		// If access fails, the directory doesn't exist - which is what we want
		if (error instanceof Error && error.message.includes('already exists')) {
			throw error;
		}
	}

	// Verify public key matches
	const configPath = path.join(oldPeerDir, 'hinter.config.json');
	try {
		const configContent = await fs.readFile(configPath, 'utf8');
		const config = JSON.parse(configContent);
		if (config.publicKey !== publicKey) {
			throw new Error('Public key mismatch');
		}
	} catch (error) {
		if (error instanceof Error && error.message === 'Public key mismatch') {
			throw error;
		}
		throw new Error('Invalid peer configuration');
	}

	// Rename the directory
	await fs.rename(oldPeerDir, newPeerDir);

	// Update any group configurations that reference this peer
	try {
		const { updatePeerConfig, getPeerConfig } = await import('./sync-engine');

		// Get the peer's current groups
		const peerConfig = await getPeerConfig(newAlias).catch(() => ({ publicKey, groups: [] }));

		// Update the peer config with the new alias (the config file moved with the directory)
		await updatePeerConfig(newAlias, peerConfig);
	} catch (error) {
		console.warn('Failed to update group configurations after peer rename:', error);
		// Don't fail the operation - the peer was successfully renamed
	}
}

// Update peer public key
export async function updatePeerPublicKey(
	alias: string,
	oldPublicKey: string,
	newPublicKey: string
): Promise<void> {
	const peerDir = path.join(getPeersDir(), alias);

	// Check if peer exists
	try {
		await fs.access(peerDir);
	} catch {
		throw new Error(`Peer with alias "${alias}" not found`);
	}

	// Verify old public key matches
	const configPath = path.join(peerDir, 'hinter.config.json');
	try {
		const configContent = await fs.readFile(configPath, 'utf8');
		const config = JSON.parse(configContent);
		if (config.publicKey !== oldPublicKey) {
			throw new Error('Public key mismatch');
		}
	} catch (error) {
		if (error instanceof Error && error.message === 'Public key mismatch') {
			throw error;
		}
		throw new Error('Invalid peer configuration');
	}

	// Check if new public key already exists
	const allPeers = await getAllPeers();
	const existingPeer = allPeers.find((p) => p.publicKey === newPublicKey);
	if (existingPeer) {
		throw new Error(`Public key already exists for peer "${existingPeer.alias}"`);
	}

	// Update the config file with new public key
	const config = { publicKey: newPublicKey };
	await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');

	// Update any group configurations that reference this peer
	try {
		const { updatePeerConfig, getPeerConfig } = await import('./sync-engine');

		// Get the peer's current groups and update with new public key
		const peerConfig = await getPeerConfig(alias).catch(() => ({
			publicKey: newPublicKey,
			groups: []
		}));
		peerConfig.publicKey = newPublicKey;
		await updatePeerConfig(alias, peerConfig);
	} catch (error) {
		console.warn('Failed to update group configurations after public key change:', error);
		// Don't fail the operation - the public key was successfully updated
	}
}

// Remove peer
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function removePeer(alias: string, _publicKey: string): Promise<void> {
	const peerDir = path.join(getPeersDir(), alias);
	await fs.rm(peerDir, { recursive: true, force: true });
}

// Helper function to collect MD files recursively for counting
async function collectMdFilesRecursively(
	dirPath: string,
	relativePath: string,
	fileList: string[]
): Promise<void> {
	try {
		const items = await fs.readdir(dirPath, { withFileTypes: true });

		for (const item of items) {
			const itemPath = path.join(dirPath, item.name);
			const currentRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;

			if (item.isDirectory()) {
				await collectMdFilesRecursively(itemPath, currentRelativePath, fileList);
			} else if (item.name.endsWith('.md')) {
				fileList.push(currentRelativePath);
			}
		}
	} catch (error) {
		console.warn(`Error reading directory ${dirPath}:`, error);
	}
}

// Create outgoing report
export async function createOutgoingReport(
	alias: string,
	publicKey: string,
	content: string,
	suffix: string = ''
): Promise<string> {
	if (!content) {
		throw new Error('Content is required');
	}

	const timestamp = new Date()
		.toISOString()
		.replace(/[-T:.Z]/g, '')
		.slice(0, 14);
	const filename = `${timestamp}${suffix}.md`;
	const outgoingDir = path.join(getPeersDir(), alias, 'outgoing');
	const filePath = path.join(outgoingDir, filename);

	await ensureDir(outgoingDir);
	await fs.writeFile(filePath, content, 'utf8');

	return filename;
}

// Get all entries
export async function getAllEntries(): Promise<Entry[]> {
	try {
		const files = await fs.readdir(getEntriesDir());
		const entries: Entry[] = [];

		for (const file of files) {
			if (file.endsWith('.md')) {
				const filePath = path.join(getEntriesDir(), file);
				const content = await fs.readFile(filePath, 'utf8');
				const stats = await fs.stat(filePath);

				entries.push({
					filename: file,
					content,
					timestamp: stats.mtime,
					size: stats.size,
					isPinned: false
				});
			}
		}

		// Get pinned entries
		try {
			const pinnedDir = path.join(getEntriesDir(), 'pinned');
			const pinnedFiles = await fs.readdir(pinnedDir);

			for (const file of pinnedFiles) {
				if (file.endsWith('.md')) {
					const filePath = path.join(pinnedDir, file);
					const content = await fs.readFile(filePath, 'utf8');
					const stats = await fs.stat(filePath);

					entries.push({
						filename: file,
						content,
						timestamp: stats.mtime,
						size: stats.size,
						isPinned: true
					});
				}
			}
		} catch (error) {
			// Pinned directory doesn't exist or is inaccessible - skip pinned entries
			if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
				console.warn('Unexpected error reading pinned entries directory:', error.message);
			}
		}

		entries.sort((a, b) => b.filename.localeCompare(a.filename));
		return entries;
	} catch (error) {
		console.error('Error getting entries:', error);
		return [];
	}
}

// Create new entry
export async function createEntry(
	content: string,
	suffix: string = '',
	isPinned: boolean = false
): Promise<string> {
	if (!content) {
		throw new Error('Content is required');
	}

	const timestamp = new Date()
		.toISOString()
		.replace(/[-T:.Z]/g, '')
		.slice(0, 14);
	const filename = `${timestamp}${suffix}.md`;

	const targetDir = isPinned ? path.join(getEntriesDir(), 'pinned') : getEntriesDir();
	const filePath = path.join(targetDir, filename);

	await ensureDir(targetDir);
	await fs.writeFile(filePath, content, 'utf8');

	return filename;
}

// Update entry content
export async function updateEntry(
	filename: string,
	content: string,
	isPinned: boolean
): Promise<void> {
	if (!content) {
		throw new Error('Content is required');
	}

	const targetDir = isPinned ? path.join(getEntriesDir(), 'pinned') : getEntriesDir();
	const filePath = path.join(targetDir, filename);

	try {
		await fs.access(filePath);
		await fs.writeFile(filePath, content, 'utf8');
	} catch {
		throw new Error('Entry not found');
	}
}

// Delete entry
export async function deleteEntry(filename: string, isPinned: boolean): Promise<void> {
	const targetDir = isPinned ? path.join(getEntriesDir(), 'pinned') : getEntriesDir();
	const filePath = path.join(targetDir, filename);

	try {
		await fs.unlink(filePath);
	} catch {
		throw new Error('Entry not found');
	}
}

// Rename entry
export async function renameEntry(
	oldFilename: string,
	newFilename: string,
	isPinned: boolean
): Promise<void> {
	if (!newFilename.endsWith('.md')) {
		newFilename += '.md';
	}

	const targetDir = isPinned ? path.join(getEntriesDir(), 'pinned') : getEntriesDir();
	const oldPath = path.join(targetDir, oldFilename);
	const newPath = path.join(targetDir, newFilename);

	try {
		await fs.access(oldPath);
		await fs.rename(oldPath, newPath);
	} catch {
		throw new Error('Entry not found or rename failed');
	}
}

// Toggle entry pin status (move between regular and pinned directories)
export async function toggleEntryPin(filename: string, currentlyPinned: boolean): Promise<void> {
	const sourceDir = currentlyPinned ? path.join(getEntriesDir(), 'pinned') : getEntriesDir();
	const targetDir = currentlyPinned ? getEntriesDir() : path.join(getEntriesDir(), 'pinned');
	const sourcePath = path.join(sourceDir, filename);
	const targetPath = path.join(targetDir, filename);

	try {
		await fs.access(sourcePath);
		await ensureDir(targetDir);
		await fs.rename(sourcePath, targetPath);
	} catch {
		throw new Error('Entry not found or move failed');
	}
}

// Mark message as read
export async function markMessageAsRead(
	alias: string,
	publicKey: string,
	filepath: string
): Promise<void> {
	const readStatus = await getReadStatus();
	const fileKey = getFileKey(alias, publicKey, filepath);
	readStatus[fileKey] = true;
	await saveReadStatus(readStatus);
}

// Get outgoing reports for a specific peer
export async function getOutgoingReports(alias: string, publicKey: string) {
	const peerDir = path.join(getPeersDir(), alias);
	const outgoingDir = path.join(peerDir, 'outgoing');

	try {
		// Check if peer exists and public key matches
		const configPath = path.join(peerDir, 'hinter.config.json');
		const configContent = await fs.readFile(configPath, 'utf8');
		const config = JSON.parse(configContent);

		if (config.publicKey !== publicKey) {
			throw new Error('Public key mismatch');
		}

		// Check if outgoing directory exists
		try {
			await fs.access(outgoingDir);
		} catch {
			return []; // No outgoing files
		}

		// Read all files recursively with folder structure (like incoming)
		const files = await readFilesRecursivelyWithFolders(outgoingDir);
		return files;
	} catch (error) {
		console.error('Error reading outgoing reports:', error);
		throw error;
	}
}

// Get incoming reports for a specific peer with folder structure and read status
export async function getIncomingReports(alias: string, publicKey: string) {
	const peerDir = path.join(getPeersDir(), alias);
	const incomingDir = path.join(peerDir, 'incoming');

	try {
		// Check if peer exists and public key matches
		const configPath = path.join(peerDir, 'hinter.config.json');
		const configContent = await fs.readFile(configPath, 'utf8');
		const config = JSON.parse(configContent);

		if (config.publicKey !== publicKey) {
			throw new Error('Public key mismatch');
		}

		// Check if incoming directory exists
		try {
			await fs.access(incomingDir);
		} catch {
			return []; // No incoming files
		}

		// Get read status
		const readStatus = await getReadStatus();

		// Read all files recursively with read status
		const files = await readFilesRecursivelyWithStatus(
			incomingDir,
			'',
			alias,
			publicKey,
			readStatus
		);
		return files;
	} catch (error) {
		console.error('Error reading incoming reports:', error);
		throw error;
	}
}

// Helper function to read files recursively
async function readFilesRecursively(
	dirPath: string,
	basePath = ''
): Promise<Array<{ filename: string; content: string; size?: number; folderPath?: string }>> {
	const files: Array<{ filename: string; content: string; size?: number; folderPath?: string }> =
		[];

	try {
		const items = await fs.readdir(dirPath, { withFileTypes: true });

		for (const item of items) {
			const itemPath = path.join(dirPath, item.name);
			const relativePath = basePath ? `${basePath}/${item.name}` : item.name;

			if (item.isDirectory()) {
				// Recursively read subdirectory
				const subFiles = await readFilesRecursively(itemPath, relativePath);
				files.push(...subFiles);
			} else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.txt'))) {
				// Read markdown or text file
				try {
					const content = await fs.readFile(itemPath, 'utf8');
					const stats = await fs.stat(itemPath);

					files.push({
						filename: item.name,
						content: content,
						size: stats.size,
						folderPath: basePath || undefined
					});
				} catch (readError) {
					console.warn(`Failed to read file ${itemPath}:`, readError);
				}
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dirPath}:`, error);
	}

	return files;
}

// Helper function to read files recursively with folder structure (for outgoing)
async function readFilesRecursivelyWithFolders(
	dirPath: string,
	basePath = ''
): Promise<
	Array<{
		filename: string;
		content: string;
		size?: number;
		folderPath?: string;
		isFolder?: boolean;
		timestamp?: Date;
	}>
> {
	const files: Array<{
		filename: string;
		content: string;
		size?: number;
		folderPath?: string;
		isFolder?: boolean;
		timestamp?: Date;
	}> = [];

	try {
		const items = await fs.readdir(dirPath, { withFileTypes: true });

		for (const item of items) {
			const itemPath = path.join(dirPath, item.name);
			const relativePath = basePath ? `${basePath}/${item.name}` : item.name;

			if (item.isDirectory()) {
				// Add folder entry
				const stats = await fs.stat(itemPath);
				files.push({
					filename: item.name,
					content: '',
					size: 0,
					folderPath: basePath || undefined,
					isFolder: true,
					timestamp: stats.mtime
				});

				// Recursively read subdirectory
				const subFiles = await readFilesRecursivelyWithFolders(itemPath, relativePath);
				files.push(...subFiles);
			} else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.txt'))) {
				// Read markdown or text file
				try {
					const content = await fs.readFile(itemPath, 'utf8');
					const stats = await fs.stat(itemPath);

					files.push({
						filename: item.name,
						content: content,
						size: stats.size,
						folderPath: basePath || undefined,
						timestamp: stats.mtime
					});
				} catch (readError) {
					console.warn(`Failed to read file ${itemPath}:`, readError);
				}
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dirPath}:`, error);
	}

	return files;
}

// Helper function to read files recursively with read status
async function readFilesRecursivelyWithStatus(
	dirPath: string,
	basePath: string,
	alias: string,
	publicKey: string,
	readStatus: ReadStatus
): Promise<
	Array<{
		filename: string;
		content: string;
		size?: number;
		folderPath?: string;
		isRead?: boolean;
		timestamp?: Date;
		isFolder?: boolean;
	}>
> {
	const files: Array<{
		filename: string;
		content: string;
		size?: number;
		folderPath?: string;
		isRead?: boolean;
		timestamp?: Date;
		isFolder?: boolean;
	}> = [];

	try {
		const items = await fs.readdir(dirPath, { withFileTypes: true });

		for (const item of items) {
			const itemPath = path.join(dirPath, item.name);
			const relativePath = basePath ? `${basePath}/${item.name}` : item.name;

			if (item.isDirectory()) {
				// Add folder entry
				files.push({
					filename: item.name,
					content: '',
					size: 0,
					folderPath: basePath || undefined,
					isFolder: true,
					timestamp: new Date()
				});

				// Recursively read subdirectory
				const subFiles = await readFilesRecursivelyWithStatus(
					itemPath,
					relativePath,
					alias,
					publicKey,
					readStatus
				);
				files.push(...subFiles);
			} else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.txt'))) {
				// Read markdown or text file
				try {
					const content = await fs.readFile(itemPath, 'utf8');
					const stats = await fs.stat(itemPath);
					const fileKey = getFileKey(alias, publicKey, relativePath);

					files.push({
						filename: item.name,
						content: content,
						size: stats.size,
						folderPath: basePath || undefined,
						isRead: !!readStatus[fileKey],
						timestamp: stats.mtime
					});
				} catch (readError) {
					console.warn(`Failed to read file ${itemPath}:`, readError);
				}
			}
		}
	} catch (error) {
		console.error(`Error reading directory ${dirPath}:`, error);
	}

	return files;
}
