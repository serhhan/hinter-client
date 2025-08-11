// Browser-compatible path utilities
function isAbsolute(pathStr: string): boolean {
	return pathStr.startsWith('/') || /^[a-zA-Z]:/.test(pathStr);
}

function basename(pathStr: string): string {
	return pathStr.split(/[/\\]/).pop() || '';
}

function extname(pathStr: string): string {
	const parts = pathStr.split('.');
	return parts.length > 1 ? '.' + parts.pop() : '';
}

/**
 * Validates a source path for report entries
 */
export function validateSourcePath(sourcePath: string): { isValid: boolean; error?: string } {
	if (!sourcePath.trim()) {
		return { isValid: true }; // Empty is allowed (content-based report)
	}

	// Check for invalid characters
	const invalidChars = /[<>:"|?*]/;
	if (invalidChars.test(sourcePath)) {
		return {
			isValid: false,
			error: 'Source path contains invalid characters (< > : " | ? *)'
		};
	}

	// Check for absolute paths (should be relative to hinter-core-data)
	if (isAbsolute(sourcePath)) {
		return {
			isValid: false,
			error: 'Source path should be relative to the hinter-core-data directory'
		};
	}

	// Check for parent directory traversal
	if (sourcePath.includes('..')) {
		return {
			isValid: false,
			error: 'Source path cannot contain parent directory references (..)'
		};
	}

	return { isValid: true };
}

/**
 * Validates a destination path for report entries
 */
export function validateDestinationPath(destinationPath: string): {
	isValid: boolean;
	error?: string;
} {
	if (!destinationPath.trim()) {
		return { isValid: true }; // Empty is allowed (will use source filename/entry filename)
	}

	// Check for invalid characters
	const invalidChars = /[<>:"|?*]/;
	if (invalidChars.test(destinationPath)) {
		return {
			isValid: false,
			error: 'Destination path contains invalid characters (< > : " | ? *)'
		};
	}

	// Check for absolute paths
	if (isAbsolute(destinationPath)) {
		return {
			isValid: false,
			error: 'Destination path should be relative'
		};
	}

	// Check for parent directory traversal
	if (destinationPath.includes('..')) {
		return {
			isValid: false,
			error: 'Destination path cannot contain parent directory references (..)'
		};
	}

	return { isValid: true };
}

/**
 * Normalizes a path for consistent handling
 */
export function normalizePath(inputPath: string): string {
	if (!inputPath.trim()) return '';

	// Convert backslashes to forward slashes for consistency
	let normalized = inputPath.replace(/\\/g, '/');

	// Remove leading and trailing slashes
	normalized = normalized.replace(/^\/+|\/+$/g, '');

	// Remove duplicate slashes
	normalized = normalized.replace(/\/+/g, '/');

	return normalized;
}

/**
 * Gets a user-friendly preview of what the destination will be
 */
export function getDestinationPreview(
	sourcePath: string,
	destinationPath: string,
	entryFilename: string
): string {
	if (destinationPath.trim()) {
		return normalizePath(destinationPath);
	}

	if (sourcePath.trim()) {
		return basename(sourcePath);
	}

	return entryFilename;
}

/**
 * Suggests common path patterns
 */
export const PATH_SUGGESTIONS = {
	source: ['docs/', 'src/', 'assets/', 'configs/', 'scripts/', 'data/'],
	destination: ['reports/', 'shared/', 'docs/', 'updates/', 'configs/']
} as const;

/**
 * Checks if a path appears to be a directory (ends with /)
 */
export function isDirectoryPath(pathStr: string): boolean {
	return pathStr.trim().endsWith('/');
}

/**
 * Ensures a path ends with / for directory operations
 */
export function ensureDirectoryPath(pathStr: string): string {
	const trimmed = pathStr.trim();
	return trimmed && !trimmed.endsWith('/') ? `${trimmed}/` : trimmed;
}

/**
 * Gets the file extension from a path
 */
export function getFileExtension(pathStr: string): string {
	return extname(pathStr).toLowerCase();
}

/**
 * Checks if a path points to a supported file type
 */
export function isSupportedFileType(pathStr: string): boolean {
	const ext = getFileExtension(pathStr);
	const supportedExtensions = ['.md', '.txt', '.json', '.yaml', '.yml', '.js', '.ts', '.py'];
	return supportedExtensions.includes(ext);
}
