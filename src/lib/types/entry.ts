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
}

export type { Entry, CreateEntryRequest };
