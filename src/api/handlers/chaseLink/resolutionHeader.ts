import type { ResolutionHeaderData } from '@deutschemodelunitednations/munify-resolution-editor/schema';
import type { AdoptedResolution } from './adoptedResolutions';

/**
 * What an adopted resolution's header prints, from this conference's own data
 * (`resolutionSync.ts`): its titles, the committee's names and resolution headline, and the agenda
 * item as topic. Pure, so it is unit tested.
 */

export interface HeaderConference {
	title: string;
	longTitle?: string | null;
}

export interface HeaderCommittee {
	abbreviation: string;
	name: string;
	resolutionHeadline?: string | null;
	agendaItems: readonly { id: string; title: string }[];
}

export function resolutionHeader({
	resolution,
	conference,
	committee
}: {
	resolution: AdoptedResolution;
	conference?: HeaderConference;
	committee?: HeaderCommittee;
}): ResolutionHeaderData {
	return {
		conferenceName: conference?.title ?? 'Model UN',
		conferenceTitle: conference?.longTitle ?? conference?.title ?? 'Model United Nations',
		committeeAbbreviation: committee?.abbreviation,
		committeeFullName: committee?.name,
		committeeResolutionHeadline: committee?.resolutionHeadline ?? undefined,
		documentNumber: resolution.documentNumber,
		topic: committee?.agendaItems.find((item) => item.id === resolution.agendaItemId)?.title
	};
}
