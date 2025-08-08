export interface Peer {
	alias: string;
	publicKey: string;
	incomingCount: number;
	outgoingCount: number;
	unreadCount: number;
	groups: string[];
}
