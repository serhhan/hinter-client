import fs from 'fs/promises';
import path from 'path';

// Types
export interface Peer {
	alias: string;
	publicKey: string;
	incomingCount: number;
	outgoingCount: number;
	unreadCount: number;
}

export interface Report {
	filename: string;
	content: string;
	timestamp: Date;
	size: number;
	isRead?: boolean;
	folderPath?: string;
	isFolder?: boolean;
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
const DATA_DIR = path.join(process.cwd(), 'hinter-core-data');
const PEERS_DIR = path.join(DATA_DIR, 'peers');
const ENTRIES_DIR = path.join(DATA_DIR, 'entries');
const READ_STATUS_FILE = path.join(DATA_DIR, 'read_status.json');

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
			.access(READ_STATUS_FILE)
			.then(() => true)
			.catch(() => false);

		if (exists) {
			const content = await fs.readFile(READ_STATUS_FILE, 'utf8');
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
		await ensureDir(DATA_DIR);
		await fs.writeFile(READ_STATUS_FILE, JSON.stringify(readStatus, null, 2));
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
		const peerDirs = await fs.readdir(PEERS_DIR, { withFileTypes: true });
		const peers: Peer[] = [];

		for (const dir of peerDirs) {
			if (dir.isDirectory()) {
				const alias = dir.name;
				
				// Read the hinter.config.json to get the publicKey
				const configPath = path.join(PEERS_DIR, dir.name, 'hinter.config.json');
				let publicKey = '';
				
				try {
					const configContent = await fs.readFile(configPath, 'utf8');
					const config = JSON.parse(configContent);
					publicKey = config.publicKey;
				} catch (error) {
					console.warn(`Could not read config for peer ${alias}:`, error);
					continue; // Skip this peer if config is invalid
				}

				const incomingDir = path.join(PEERS_DIR, dir.name, 'incoming');
				const outgoingDir = path.join(PEERS_DIR, dir.name, 'outgoing');

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

				peers.push({
					alias,
					publicKey,
					incomingCount,
					outgoingCount,
					unreadCount
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

	const peerDir = path.join(PEERS_DIR, alias);
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

// Remove peer
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function removePeer(alias: string, _publicKey: string): Promise<void> {
	const peerDir = path.join(PEERS_DIR, alias);
	await fs.rm(peerDir, { recursive: true, force: true });
}

// Get incoming reports for a peer (with folder support)
export async function getIncomingReports(alias: string, publicKey: string): Promise<Report[]> {
	const incomingDir = path.join(PEERS_DIR, alias, 'incoming');

	try {
		const reports: Report[] = [];
		const readStatus = await getReadStatus();

		await scanDirectoryRecursively(incomingDir, '', alias, publicKey, readStatus, reports);

		// Sort by folder path first, then by filename
		reports.sort((a, b) => {
			if (a.folderPath !== b.folderPath) {
				return (a.folderPath || '').localeCompare(b.folderPath || '');
			}
			return b.filename.localeCompare(a.filename);
		});

		return reports;
	} catch (error) {
		console.error('Error getting incoming reports:', error);
		return [];
	}
}

// Helper function to recursively scan directories
async function scanDirectoryRecursively(
	dirPath: string,
	relativePath: string,
	alias: string,
	publicKey: string,
	readStatus: ReadStatus,
	reports: Report[]
): Promise<void> {
	try {
		const items = await fs.readdir(dirPath, { withFileTypes: true });

		for (const item of items) {
			const itemPath = path.join(dirPath, item.name);
			const currentRelativePath = relativePath ? path.join(relativePath, item.name) : item.name;

			if (item.isDirectory()) {
				// Calculate unread count for this folder
				const folderUnreadCount = await getFolderUnreadCount(
					itemPath,
					currentRelativePath,
					alias,
					publicKey,
					readStatus
				);

				// Add folder header
				reports.push({
					filename: item.name,
					content: '',
					timestamp: new Date(),
					size: 0,
					isFolder: true,
					folderPath: relativePath,
					unreadCount: folderUnreadCount
				});

				// Recursively scan the subdirectory
				await scanDirectoryRecursively(
					itemPath,
					currentRelativePath,
					alias,
					publicKey,
					readStatus,
					reports
				);
			} else if (item.name.endsWith('.md')) {
				const content = await fs.readFile(itemPath, 'utf8');
				const stats = await fs.stat(itemPath);

				const fileKey = getFileKey(alias, publicKey, currentRelativePath);
				reports.push({
					filename: item.name,
					content,
					timestamp: stats.mtime,
					size: stats.size,
					isRead: !!readStatus[fileKey],
					folderPath: relativePath
				});
			}
		}
	} catch (error) {
		console.warn(`Error reading directory ${dirPath}:`, error);
	}
}

// Helper function to calculate unread count for a specific folder
async function getFolderUnreadCount(
	folderPath: string,
	relativeFolderPath: string,
	alias: string,
	publicKey: string,
	readStatus: ReadStatus
): Promise<number> {
	let unreadCount = 0;

	try {
		const items = await fs.readdir(folderPath, { withFileTypes: true });

		for (const item of items) {
			const itemPath = path.join(folderPath, item.name);
			const currentRelativePath = path.join(relativeFolderPath, item.name);

			if (item.isDirectory()) {
				// Recursively count unread files in subdirectories
				const subfolderUnreadCount = await getFolderUnreadCount(
					itemPath,
					currentRelativePath,
					alias,
					publicKey,
					readStatus
				);
				unreadCount += subfolderUnreadCount;
			} else if (item.name.endsWith('.md')) {
				const fileKey = getFileKey(alias, publicKey, currentRelativePath);
				if (!readStatus[fileKey]) {
					unreadCount++;
				}
			}
		}
	} catch (error) {
		console.warn(`Error reading folder ${folderPath}:`, error);
	}

	return unreadCount;
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

// Get outgoing reports for a peer
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function getOutgoingReports(alias: string, _publicKey: string): Promise<Report[]> {
	const outgoingDir = path.join(PEERS_DIR, alias, 'outgoing');

	try {
		const files = await fs.readdir(outgoingDir);
		const reports: Report[] = [];

		for (const file of files) {
			if (file.endsWith('.md')) {
				const filePath = path.join(outgoingDir, file);
				const content = await fs.readFile(filePath, 'utf8');
				const stats = await fs.stat(filePath);

				reports.push({
					filename: file,
					content,
					timestamp: stats.mtime,
					size: stats.size
				});
			}
		}

		reports.sort((a, b) => b.filename.localeCompare(a.filename));
		return reports;
	} catch (error) {
		console.error('Error getting outgoing reports:', error);
		return [];
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
	const outgoingDir = path.join(PEERS_DIR, alias, 'outgoing');
	const filePath = path.join(outgoingDir, filename);

	await ensureDir(outgoingDir);
	await fs.writeFile(filePath, content, 'utf8');

	return filename;
}

// Get all entries
export async function getAllEntries(): Promise<Entry[]> {
	try {
		const files = await fs.readdir(ENTRIES_DIR);
		const entries: Entry[] = [];

		for (const file of files) {
			if (file.endsWith('.md')) {
				const filePath = path.join(ENTRIES_DIR, file);
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
			const pinnedDir = path.join(ENTRIES_DIR, 'pinned');
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

	const targetDir = isPinned ? path.join(ENTRIES_DIR, 'pinned') : ENTRIES_DIR;
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

	const targetDir = isPinned ? path.join(ENTRIES_DIR, 'pinned') : ENTRIES_DIR;
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
	const targetDir = isPinned ? path.join(ENTRIES_DIR, 'pinned') : ENTRIES_DIR;
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

	const targetDir = isPinned ? path.join(ENTRIES_DIR, 'pinned') : ENTRIES_DIR;
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
	const sourceDir = currentlyPinned ? path.join(ENTRIES_DIR, 'pinned') : ENTRIES_DIR;
	const targetDir = currentlyPinned ? ENTRIES_DIR : path.join(ENTRIES_DIR, 'pinned');
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
