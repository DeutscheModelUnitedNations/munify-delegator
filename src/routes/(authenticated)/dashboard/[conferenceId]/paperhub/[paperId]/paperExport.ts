import type { PapertypeEnum } from '#lib/api/rumbleClient/client';
import type { ResolutionHeaderData } from '#lib/components/paper/editor/resolution/index';
import type { ConferenceRoleKind } from '#lib/helpers/conferenceRole';
import type { PaperTypstBranding, PaperTypstMeta } from '#lib/helpers/paperTypst';
import { brandOfSeries, typstLang } from '#lib/helpers/typstTemplate';
import { m } from '#lib/paraglide/messages';
import { translatePaperType } from '#lib/utils/enumTranslations';
import { paperEntityName } from '../paperDisplay';

/** The fields of a paper its export reads. */
export interface ExportablePaper {
	id: string;
	type: PapertypeEnum;
	conference: {
		title: string | null;
		language?: string | null;
		series?: { abbreviation: string } | null;
	};
	agendaItem: { title: string; committee: { name: string; abbreviation: string } } | null;
	delegation: {
		assignedRole: {
			kind: ConferenceRoleKind;
			name: string | null;
			nation: { alpha3Code: string } | null;
		} | null;
	};
}

/** "General Assembly (GA)", or just the name without an abbreviation. */
export function committeeLine(committee: { name: string; abbreviation: string } | undefined) {
	if (!committee?.name) return undefined;
	return committee.abbreviation ? `${committee.name} (${committee.abbreviation})` : committee.name;
}

function conferenceNameOf(paper: ExportablePaper) {
	return paper.conference.title ?? 'Model UN';
}

/** The labels of a position or introduction paper's page. */
export function paperTypstMeta({
	paper,
	documentNumber
}: {
	paper: ExportablePaper;
	documentNumber?: string;
}): PaperTypstMeta {
	return {
		paperType: translatePaperType(paper.type),
		entityName: paperEntityName(paper.delegation),
		committeeLine: committeeLine(paper.agendaItem?.committee),
		committeeLabel: m.committee(),
		topic: paper.agendaItem?.title,
		topicLabel: m.resolutionTopic().replace(':', ''),
		disclaimer: m.paperPrintDisclaimer({ conferenceName: conferenceNameOf(paper) }),
		documentNumber
	};
}

/**
 * The conference's look for the `.typ` download; the PDF's is decided by the server, which also
 * adds the logo.
 */
export function paperTypstBranding(paper: ExportablePaper): PaperTypstBranding {
	return {
		conferenceName: conferenceNameOf(paper),
		brand: brandOfSeries(paper.conference.series?.abbreviation),
		lang: typstLang(paper.conference.language)
	};
}

/** Short type codes for document numbers, the same in every language. */
const PAPER_TYPE_CODES: Record<PapertypeEnum, string> = {
	POSITION_PAPER: 'PP',
	INTRODUCTION_PAPER: 'IP',
	WORKING_PAPER: 'WP'
};

/** "PP-2026-ABCDEF": type, year and the end of the paper's id. */
export function paperDocumentNumber(paper: { id: string; type: PapertypeEnum }) {
	return `${PAPER_TYPE_CODES[paper.type]}-${new Date().getFullYear()}-${paper.id.slice(-6).toUpperCase()}`;
}

/**
 * How a paper is exported: working papers as a resolution under the header the editor shows,
 * every other paper as a text document. `docNumber` is the base of the file name: the
 * resolution's document number, otherwise `paperDocumentNumber`.
 */
export type PaperExportJob =
	| { kind: 'resolution'; header: ResolutionHeaderData; docNumber: string | undefined }
	| { kind: 'paper'; meta: PaperTypstMeta; branding: PaperTypstBranding; docNumber: string };

export function paperExportJob({
	paper,
	resolutionHeaderData
}: {
	paper: ExportablePaper;
	resolutionHeaderData: ResolutionHeaderData | undefined;
}): PaperExportJob {
	if (paper.type === 'WORKING_PAPER') {
		return {
			kind: 'resolution',
			header: resolutionHeaderData ?? {},
			docNumber: resolutionHeaderData?.documentNumber
		};
	}
	const docNumber = paperDocumentNumber(paper);
	return {
		kind: 'paper',
		meta: paperTypstMeta({ paper, documentNumber: docNumber }),
		branding: paperTypstBranding(paper),
		docNumber
	};
}
