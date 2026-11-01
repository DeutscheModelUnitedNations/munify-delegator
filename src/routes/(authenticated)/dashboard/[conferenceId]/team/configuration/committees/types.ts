export interface AgendaItem {
	id: string;
	title: string;
	teaserText: string | null;
	papers: { id: string }[];
}

export interface ManagedCommittee {
	id: string;
	name: string;
	abbreviation: string;
	numOfSeatsPerDelegation: number;
	resolutionHeadline: string | null;
	/** the nation roles the committee seats */
	roles: { id: string }[];
	delegationMembers: { id: string }[];
	agendaItems: AgendaItem[];
}
