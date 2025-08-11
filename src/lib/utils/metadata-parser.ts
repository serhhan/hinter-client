export interface ParsedMetadata {
	to: string[];
	except: string[];
	sourcePath: string; // Legacy: single file path
	sourceFiles: string[]; // New: multiple file paths
	destinationPath: string;
	cleanContent: string;
}

// Parse metadata from entry content
export function parseMetadata(content: string): ParsedMetadata {
	const metadata: ParsedMetadata = {
		to: [],
		except: [],
		sourcePath: '',
		sourceFiles: [],
		destinationPath: '',
		cleanContent: content
	};

	// Look for YAML frontmatter
	const yamlFrontmatterRegex = /^---\n([\s\S]*?)\n---\n\n([\s\S]*)/;
	const yamlMatch = content.match(yamlFrontmatterRegex);

	if (yamlMatch) {
		try {
			const yamlContent = yamlMatch[1];
			metadata.cleanContent = yamlMatch[2];

			// Parse to field
			const toMatch = yamlContent.match(/to:\s*\[\s*([\s\S]*?)\s*\]/);
			if (toMatch) {
				const toItems = toMatch[1]
					.split(',')
					.map((item) => item.trim().replace(/'/g, '').replace(/"/g, ''));
				metadata.to = toItems.filter((item) => item.length > 0);
			}

			// Parse except field
			const exceptMatch = yamlContent.match(/except:\s*\[\s*([\s\S]*?)\s*\]/);
			if (exceptMatch) {
				const exceptItems = exceptMatch[1]
					.split(',')
					.map((item) => item.trim().replace(/'/g, '').replace(/"/g, ''));
				metadata.except = exceptItems.filter((item) => item.length > 0);
			}

			// Parse sourcePath (legacy single file)
			const sourcePathMatch = yamlContent.match(/sourcePath:\s*['"]([^'"]*)['"]/);
			if (sourcePathMatch) {
				metadata.sourcePath = sourcePathMatch[1];
			}

			// Parse sourceFiles (new multiple files array)
			const sourceFilesMatch = yamlContent.match(/sourceFiles:\s*\[\s*([\s\S]*?)\s*\]/);
			if (sourceFilesMatch) {
				const sourceFileItems = sourceFilesMatch[1]
					.split(',')
					.map((item) => item.trim().replace(/'/g, '').replace(/"/g, ''));
				metadata.sourceFiles = sourceFileItems.filter((item) => item.length > 0);
			}

			// If we have sourcePath but no sourceFiles, use sourcePath for backward compatibility
			if (metadata.sourcePath && metadata.sourceFiles.length === 0) {
				metadata.sourceFiles = [metadata.sourcePath];
			}

			// Parse destinationPath
			const destinationPathMatch = yamlContent.match(/destinationPath:\s*['"]([^'"]*)['"]/);
			if (destinationPathMatch) {
				metadata.destinationPath = destinationPathMatch[1];
			}
		} catch (e) {
			// If parsing fails, return original content
			console.warn('Failed to parse YAML metadata:', e);
		}
	} else {
		// Look for inline metadata format (current format used by the app)
		const inlineRegex = /^(.+?)\n\n([\s\S]*)$/;
		const inlineMatch = content.match(inlineRegex);

		if (inlineMatch) {
			const metadataLine = inlineMatch[1];
			const bodyContent = inlineMatch[2];

			// Parse individual fields from the metadata line
			const toMatch = metadataLine.match(/to:\s*(\[.*?\])/);
			const exceptMatch = metadataLine.match(/except:\s*(\[.*?\])/);
			const sourceFilesMatch = metadataLine.match(/sourceFiles:\s*(\[.*?\])/);
			const destinationPathMatch = metadataLine.match(/destinationPath:\s*['"]([^'"]*)['"]/);

			try {
				if (toMatch) {
					const toArray = JSON.parse(toMatch[1].replace(/'/g, '"'));
					metadata.to = Array.isArray(toArray) ? toArray : [];
				}

				if (exceptMatch) {
					const exceptArray = JSON.parse(exceptMatch[1].replace(/'/g, '"'));
					metadata.except = Array.isArray(exceptArray) ? exceptArray : [];
				}

				if (sourceFilesMatch) {
					const sourceFilesArray = JSON.parse(sourceFilesMatch[1].replace(/'/g, '"'));
					metadata.sourceFiles = Array.isArray(sourceFilesArray) ? sourceFilesArray : [];
				}

				if (destinationPathMatch) {
					metadata.destinationPath = destinationPathMatch[1];
				}

				metadata.cleanContent = bodyContent;
			} catch (e) {
				console.warn('Failed to parse inline metadata:', e);
			}
		}
	}

	return metadata;
}

// Generate YAML frontmatter from metadata
export function generateMetadataHeader(
	to: string[],
	except: string[],
	sourceFiles: string[],
	destinationPath: string
): string {
	if (to.length === 0 && except.length === 0 && sourceFiles.length === 0 && !destinationPath) {
		return '';
	}

	const toArray =
		to.length > 0 ? `[\n    ${to.map((peer) => `'${peer}'`).join(',\n    ')}\n  ]` : '[]';
	const exceptArray =
		except.length > 0 ? `[\n    ${except.map((peer) => `'${peer}'`).join(',\n    ')}\n  ]` : '[]';
	const sourceFilesArray =
		sourceFiles.length > 0
			? `[\n    ${sourceFiles.map((file) => `'${file}'`).join(',\n    ')}\n  ]`
			: '[]';

	return `---
to:
  ${toArray}
except: ${exceptArray}
sourceFiles: ${sourceFilesArray}
destinationPath: '${destinationPath}'
---

`;
}
