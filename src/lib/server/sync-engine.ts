import fs from 'fs/promises';
import path from 'path';
import { parseMetadata } from '$lib/utils/metadata-parser';
import { getAllPeers, getAllEntries } from './database';

export interface SyncResult {
	reportsProcessed: number;
	reportsDistributed: number;
	reportsRemoved: number;
	errors: string[];
}

export interface PeerConfig {
	publicKey: string;
	groups?: string[];
}

// Get peer configuration
export async function getPeerConfig(alias: string): Promise<PeerConfig> {
	const configPath = path.join(
		process.cwd(),
		'hinter-core-data',
		'peers',
		alias,
		'hinter.config.json'
	);
	try {
		const configContent = await fs.readFile(configPath, 'utf8');
		return JSON.parse(configContent);
	} catch (error) {
		console.warn(`Could not read config for peer ${alias}:`, error);
		return { publicKey: '' };
	}
}

// Update peer configuration
export async function updatePeerConfig(alias: string, config: PeerConfig): Promise<void> {
	const configPath = path.join(
		process.cwd(),
		'hinter-core-data',
		'peers',
		alias,
		'hinter.config.json'
	);
	await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// Get all groups from peer configurations
export async function getGroups(): Promise<Map<string, string[]>> {
	const groups = new Map<string, string[]>();
	const peers = await getAllPeers();

	for (const peer of peers) {
		const config = await getPeerConfig(peer.alias);
		const peerGroups = config.groups || [];

		for (const group of peerGroups) {
			if (!groups.has(group)) {
				groups.set(group, []);
			}
			groups.get(group)!.push(peer.alias);
		}
	}

	// Add the implicit "all" group
	groups.set(
		'all',
		peers.map((p) => p.alias)
	);

	return groups;
}

// Expand group recipients to individual peer aliases
export async function expandRecipients(recipients: string[]): Promise<string[]> {
	const groups = await getGroups();
	const expandedSet = new Set<string>();

	for (const recipient of recipients) {
		if (recipient.startsWith('group:')) {
			const groupName = recipient.substring(6);
			if (groups.has(groupName)) {
				groups.get(groupName)!.forEach((peer) => expandedSet.add(peer));
			} else {
				throw new Error(`Invalid group name '${groupName}' found in recipients.`);
			}
		} else {
			expandedSet.add(recipient);
		}
	}

	return Array.from(expandedSet);
}

// Get groups for a specific peer
export async function getPeerGroups(alias: string): Promise<string[]> {
	try {
		const config = await getPeerConfig(alias);
		const groups = config.groups || [];

		// Always include the "all" group
		return ['all', ...groups];
	} catch (error) {
		console.error(`Error getting groups for peer ${alias}:`, error);
		return ['all']; // At minimum, every peer is in the "all" group
	}
}

// Calculate final recipients (to - except)
export async function calculateFinalRecipients(to: string[], except: string[]): Promise<string[]> {
	const expandedTo = await expandRecipients(to);
	const expandedExcept = await expandRecipients(except);

	return expandedTo.filter((peer) => !expandedExcept.includes(peer));
}

// Copy file or directory recursively (currently using fs.copyFile instead)
// async function copyRecursively(sourcePath: string, destPath: string): Promise<void> {
// 	const stats = await fs.stat(sourcePath);
//
// 	if (stats.isDirectory()) {
// 		await fs.mkdir(destPath, { recursive: true });
// 		const entries = await fs.readdir(sourcePath);
//
// 		for (const entry of entries) {
// 			const srcPath = path.join(sourcePath, entry);
// 			const dstPath = path.join(destPath, entry);
// 			await copyRecursively(srcPath, dstPath);
// 		}
// 	} else {
// 		await fs.mkdir(path.dirname(destPath), { recursive: true });
// 		await fs.copyFile(sourcePath, destPath);
// 	}
// }

// Remove empty directories recursively
async function removeEmptyDirectories(dirPath: string): Promise<void> {
	try {
		const entries = await fs.readdir(dirPath);

		// First, recursively clean subdirectories
		for (const entry of entries) {
			const entryPath = path.join(dirPath, entry);
			const stats = await fs.stat(entryPath);
			if (stats.isDirectory()) {
				await removeEmptyDirectories(entryPath);
			}
		}

		// Check if directory is now empty and remove if so
		const remainingEntries = await fs.readdir(dirPath);
		if (remainingEntries.length === 0) {
			await fs.rmdir(dirPath);
		}
	} catch {
		// Directory doesn't exist or can't be read - ignore
	}
}

// Main synchronization function
export async function syncReports(): Promise<SyncResult> {
	const result: SyncResult = {
		reportsProcessed: 0,
		reportsDistributed: 0,
		reportsRemoved: 0,
		errors: []
	};

	try {
		const entries = await getAllEntries();
		const peers = await getAllPeers();
		const entriesPath = path.join(process.cwd(), 'hinter-core-data', 'entries');

		// Map to track what files each peer should have
		const peerFiles = new Map<
			string,
			Map<string, { type: 'content' | 'file'; data?: string; path?: string }>
		>();

		// Initialize maps for each peer
		for (const peer of peers) {
			peerFiles.set(peer.alias, new Map());
		}

		// Process each entry
		for (const entry of entries) {
			if (!entry.filename.endsWith('.md')) continue;

			result.reportsProcessed++;

			try {
				const metadata = parseMetadata(entry.content);

				// Skip entries without metadata
				if (metadata.to.length === 0 && metadata.except.length === 0) {
					continue;
				}

				const recipients = await calculateFinalRecipients(metadata.to, metadata.except);
				const sourceFiles = metadata.sourceFiles || [];
				const destinationPath = metadata.destinationPath;

				// Determine base destination folder
				const baseDestination = destinationPath || entry.filename.replace('.md', '');

				// If we have sourceFiles, put everything inside a folder
				// Otherwise, just put the report at root level
				// If package name is specified (destinationPath), always use folder structure
				// If no package name but has files, also use folder structure
				if (destinationPath || sourceFiles.length > 0) {
					// Package approach: create folder with report + files inside
					const reportDestination = `${baseDestination}/${entry.filename}`;
					for (const peerAlias of recipients) {
						peerFiles.get(peerAlias)?.set(reportDestination, {
							type: 'content',
							data: metadata.cleanContent
						});
					}
				} else {
					// Simple report: just the .md file at root level
					const reportDestination = baseDestination.endsWith('.md')
						? baseDestination
						: `${baseDestination}.md`;
					for (const peerAlias of recipients) {
						peerFiles.get(peerAlias)?.set(reportDestination, {
							type: 'content',
							data: metadata.cleanContent
						});
					}
				}
				// If sourceFiles are provided, include them in the package
				if (sourceFiles.length > 0) {
					for (const sourceFile of sourceFiles) {
						// sourceFile is now a relative path from hinter-core-data
						const absoluteSourcePath = path.resolve(process.cwd(), 'hinter-core-data', sourceFile);

						try {
							const stats = await fs.stat(absoluteSourcePath);

							if (stats.isDirectory()) {
								// Create a folder structure: baseDestination/files/dirName/...
								const dirName = path.basename(absoluteSourcePath);
								const filesFolder = `${baseDestination}/files/${dirName}`;

								// Walk through directory
								const files = await walkDirectory(absoluteSourcePath);
								for (const filePath of files) {
									const relativePath = path.relative(absoluteSourcePath, filePath);
									const finalDest = path.join(filesFolder, relativePath);

									for (const peerAlias of recipients) {
										peerFiles.get(peerAlias)?.set(finalDest, {
											type: 'file',
											path: filePath
										});
									}
								}
							} else {
								// Single file: add it to the files folder
								const fileName = path.basename(absoluteSourcePath);
								const fileDest = `${baseDestination}/files/${fileName}`;

								for (const peerAlias of recipients) {
									peerFiles.get(peerAlias)?.set(fileDest, {
										type: 'file',
										path: absoluteSourcePath
									});
								}
							}
						} catch (error) {
							result.errors.push(
								`Error accessing source file ${absoluteSourcePath} for entry ${entry.filename}: ${error}`
							);
						}
					}
				}
			} catch (error) {
				result.errors.push(`Error processing entry ${entry.filename}: ${error}`);
			}
		}

		// Apply changes to peer directories
		for (const peer of peers) {
			const peerOutgoingPath = path.join(
				process.cwd(),
				'hinter-core-data',
				'peers',
				peer.alias,
				'outgoing'
			);
			await fs.mkdir(peerOutgoingPath, { recursive: true });

			const desiredFiles = peerFiles.get(peer.alias)!;

			// Get current files in peer's outgoing directory
			const currentFiles = new Set<string>();
			await walkDirectory(peerOutgoingPath)
				.then((files) => {
					files.forEach((file) => {
						currentFiles.add(path.relative(peerOutgoingPath, file));
					});
				})
				.catch(() => {
					// Directory doesn't exist yet - that's fine
				});

			// Remove files that shouldn't exist
			for (const currentFile of currentFiles) {
				if (!desiredFiles.has(currentFile)) {
					await fs.unlink(path.join(peerOutgoingPath, currentFile));
					result.reportsRemoved++;
				}
			}

			// Add/update files that should exist
			for (const [fileName, source] of desiredFiles) {
				const destPath = path.join(peerOutgoingPath, fileName);
				await fs.mkdir(path.dirname(destPath), { recursive: true });

				let needsUpdate = false;

				// Check if file needs updating
				try {
					if (source.type === 'file' && source.path) {
						// Compare file timestamps and size
						const [sourceStat, destStat] = await Promise.all([
							fs.stat(source.path),
							fs.stat(destPath).catch(() => null)
						]);

						needsUpdate =
							!destStat || sourceStat.mtime > destStat.mtime || sourceStat.size !== destStat.size;
					} else if (source.type === 'content' && source.data) {
						// Compare content
						const existingContent = await fs.readFile(destPath, 'utf8').catch(() => null);
						needsUpdate = existingContent !== source.data;
					}
				} catch {
					// File doesn't exist or can't be read - needs update
					needsUpdate = true;
				}

				if (needsUpdate) {
					if (source.type === 'file' && source.path) {
						await fs.copyFile(source.path, destPath);
					} else if (source.type === 'content' && source.data) {
						await fs.writeFile(destPath, source.data, 'utf8');
					}
					result.reportsDistributed++;
				}
			}

			// Clean up empty directories
			await removeEmptyDirectories(peerOutgoingPath);
		}
	} catch (error) {
		result.errors.push(`Sync error: ${error}`);
	}

	return result;
}

// Helper function to walk directory recursively
async function walkDirectory(dirPath: string): Promise<string[]> {
	const files: string[] = [];

	try {
		const entries = await fs.readdir(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const entryPath = path.join(dirPath, entry.name);

			if (entry.isDirectory()) {
				const subFiles = await walkDirectory(entryPath);
				files.push(...subFiles);
			} else {
				files.push(entryPath);
			}
		}
	} catch {
		// Directory doesn't exist or can't be read
	}

	return files;
}
