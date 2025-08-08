export interface ParsedMetadata {
	to: string[];
	except: string[];
	sourcePath: string;
	destinationPath: string;
	cleanContent: string;
}

// Parse metadata from entry content
export function parseMetadata(content: string): ParsedMetadata {
	const metadata: ParsedMetadata = {
		to: [],
		except: [],
		sourcePath: '',
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

			// Parse sourcePath
			const sourcePathMatch = yamlContent.match(/sourcePath:\s*['"]([^'"]*)['"]/);
			if (sourcePathMatch) {
				metadata.sourcePath = sourcePathMatch[1];
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
		// Fallback: Look for old format metadata at the beginning of the content
		const metadataRegex =
			/^to:\s*(\[.*?\])\s*except:\s*(\[.*?\])\s*sourcePath:\s*'([^']*)'?\s*destinationPath:\s*'([^']*)'?\s*\n\n([\s\S]*)/;
		const match = content.match(metadataRegex);

		if (match) {
			try {
				// Parse arrays safely
				const toArray = JSON.parse(match[1].replace(/'/g, '"'));
				const exceptArray = JSON.parse(match[2].replace(/'/g, '"'));

				metadata.to = Array.isArray(toArray) ? toArray : [];
				metadata.except = Array.isArray(exceptArray) ? exceptArray : [];
				metadata.sourcePath = match[3] || '';
				metadata.destinationPath = match[4] || '';
				metadata.cleanContent = match[5] || content;
			} catch (e) {
				// If parsing fails, return original content
				console.warn('Failed to parse metadata:', e);
			}
		}
	}

	return metadata;
}

// Generate YAML frontmatter from metadata
export function generateMetadataHeader(
	to: string[],
	except: string[],
	sourcePath: string,
	destinationPath: string
): string {
	if (to.length === 0 && except.length === 0 && !sourcePath && !destinationPath) {
		return '';
	}

	const toArray =
		to.length > 0 ? `[\n    ${to.map((peer) => `'${peer}'`).join(',\n    ')}\n  ]` : '[]';
	const exceptArray =
		except.length > 0 ? `[\n    ${except.map((peer) => `'${peer}'`).join(',\n    ')}\n  ]` : '[]';

	return `---
to:
  ${toArray}
except: ${exceptArray}
sourcePath: '${sourcePath}'
destinationPath: '${destinationPath}'
---

`;
}
