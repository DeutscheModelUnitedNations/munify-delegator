import type { ResolutionHeaderData } from '@deutschemodelunitednations/munify-resolution-editor/schema';
import { unEmblemSvg } from '@deutschemodelunitednations/munify-resolution-editor';
import { m } from '#lib/paraglide/messages';
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

/** The resolution's title: the paper's, else its document number. */
export function resolutionTitle(resolution: Pick<AdoptedResolution, 'title' | 'documentNumber'>) {
	return resolution.title ?? resolution.documentNumber ?? m.resolution();
}

const EMBLEM_EXTENSIONS: Record<string, string> = {
	'image/svg+xml': 'svg',
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif'
};

/** The emblem file the header prints: the conference's, or the UN's for none Typst can show. */
export function emblemFileOf(emblem: { mimeType: string; bytes: Uint8Array } | null | undefined) {
	const fallback = { path: 'emblem.svg', bytes: unEmblemSvg };
	if (!emblem) return fallback;
	const extension = EMBLEM_EXTENSIONS[emblem.mimeType];
	return extension ? { path: `emblem.${extension}`, bytes: emblem.bytes } : fallback;
}
