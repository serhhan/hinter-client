interface Entry {
	filename: string;
	content: string;
	timestamp: Date;
	size: number;
	isPinned: boolean;
}

interface CreateEntryRequest {
	content: string;
	suffix?: string;
	isPinned?: boolean;
	to?: string[];
	except?: string[];
	sourceFiles?: string[];
	destinationPath?: string;
}

export type { Entry, CreateEntryRequest };
