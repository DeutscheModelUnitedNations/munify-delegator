import { get } from 'svelte/store';
import type { PapertypeEnum } from '$lib/api/rumbleClient/client';
import {
	validateResolution,
	createEmptyResolution,
	type ResolutionHeaderData
} from '$lib/components/paper/editor/resolution';
import { editorContentStore, resolutionStore } from '$lib/components/paper/editor/editorStore';
import { translatePaperType } from '$lib/utils/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';

/**
 * What the paper pages need to name a paper and its authoring delegation. Structural, so both the
 * author/reviewer page and the public read-only view can hand over their own query results.
 */
export interface PaperIdentity {
	id: string;
	type: PapertypeEnum;
	agendaItem: {
		title: string;
		committee: { abbreviation: string; name: string; resolutionHeadline?: string | null };
	} | null;
	delegation: {
		assignedNation: { alpha2Code: string; alpha3Code: string } | null;
		assignedNonStateActor: { name: string; fontAwesomeIcon: string | null } | null;
	};
}

export interface PaperConferenceInfo {
	title: string;
	longTitle: string | null;
	emblemDataURL: string | null;
}

/** "GA: Climate change", or just the paper type for papers without an agenda item. */
export function paperTitle(paper: PaperIdentity) {
	return paper.agendaItem?.title
		? `${paper.agendaItem.committee.abbreviation}: ${paper.agendaItem.title}`
		: translatePaperType(paper.type);
}

/** The nation's translated name, or the non-state actor's name. */
export function paperEntityName(delegation: {
	assignedNation: { alpha3Code: string } | null;
	assignedNonStateActor: { name: string } | null;
}) {
	const nation = delegation.assignedNation;
	return nation
		? getFullTranslatedCountryNameFromISO3Code(nation.alpha3Code)
		: delegation.assignedNonStateActor?.name;
}

/** What a resolution header prints besides the conference. */
export interface ResolutionHeaderParts {
	committee:
		{ abbreviation: string; name: string; resolutionHeadline?: string | null } | null | undefined;
	topic: string | undefined;
	authoringDelegation: string | undefined;
	documentNumber: string;
}

/**
 * The header printed above a resolution, with generic conference names where the conference is
 * not known.
 */
export function resolutionHeader(
	conference: PaperConferenceInfo | null | undefined,
	{ committee, topic, authoringDelegation, documentNumber }: ResolutionHeaderParts
): ResolutionHeaderData {
	return {
		conferenceName: conference?.title ?? 'Model UN',
		conferenceTitle: conference?.longTitle ?? conference?.title ?? 'Model United Nations',
		committeeAbbreviation: committee?.abbreviation,
		committeeFullName: committee?.name,
		committeeResolutionHeadline: committee?.resolutionHeadline ?? undefined,
		documentNumber,
		topic,
		authoringDelegation,
		conferenceEmblem: conference?.emblemDataURL ?? undefined
	};
}

/** The header the resolution editor and the resolution export print above a working paper. */
export function buildResolutionHeaderData(
	paper: PaperIdentity,
	conference: PaperConferenceInfo | null | undefined
): ResolutionHeaderData | undefined {
	if (paper.type !== 'WORKING_PAPER') return undefined;
	return resolutionHeader(conference, {
		committee: paper.agendaItem?.committee,
		topic: paper.agendaItem?.title,
		authoringDelegation: paperEntityName(paper.delegation),
		documentNumber: `WP/${new Date().getFullYear()}/${paper.id.slice(-6)}`
	});
}

/**
 * `validateResolution`, minus its one way of throwing: it migrates legacy content first, and for
 * content that is not legacy that migration is a strict `parse`, which throws on exactly the
 * invalid content the function is meant to report. Once fixed upstream this is a plain call.
 */
function safelyValidateResolution(content: unknown): ReturnType<typeof validateResolution> {
	try {
		return validateResolution(content);
	} catch (error) {
		return { valid: false, error: error instanceof Error ? error.message : String(error) };
	}
}

/**
 * Seeds the shared editor store matching the paper's type with its latest content.
 *
 * Working papers are validated first; content that does not parse as a resolution leaves an empty
 * resolution in the editor and is handed back so the page can offer it as a download.
 */
export function loadPaperIntoEditor(
	paper: PaperIdentity,
	latestContent: unknown
): { validationError: string | null; invalidRawContent: unknown } {
	const committeeName = paper.agendaItem?.committee.name ?? '';
	if (paper.type === 'WORKING_PAPER') {
		if (latestContent === undefined) {
			resolutionStore.replaceResolution(createEmptyResolution(committeeName));
			return { validationError: null, invalidRawContent: null };
		}
		const validationResult = safelyValidateResolution(latestContent);
		if (validationResult.valid) {
			resolutionStore.replaceResolution(validationResult.data);
			return { validationError: null, invalidRawContent: null };
		}
		resolutionStore.replaceResolution(createEmptyResolution(committeeName));
		return { validationError: validationResult.error, invalidRawContent: latestContent };
	}
	editorContentStore.set(latestContent === undefined ? '' : latestContent);
	return { validationError: null, invalidRawContent: null };
}

/** The editor content of the paper currently loaded, from the store matching its type. */
export function currentEditorContent(type: PapertypeEnum) {
	return type === 'WORKING_PAPER' ? resolutionStore.snapshot : get(editorContentStore);
}
