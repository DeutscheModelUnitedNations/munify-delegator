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
	nations: { alpha3Code: string }[];
	delegationMembers: { id: string }[];
	agendaItems: AgendaItem[];
}
