// Global Window interface extensions for onclick handlers in rendered HTML

declare global {
	interface Window {
		handleTeamMemberDelete?: (id: string) => void;
		handleTeamMemberImpersonate?: (userId: string) => void;
	}
}

export {};
