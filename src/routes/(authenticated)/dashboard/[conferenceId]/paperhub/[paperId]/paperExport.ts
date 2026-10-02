import type { PapertypeEnum } from '$lib/api/rumbleClient/client';
import type { ResolutionHeaderData } from '$lib/components/paper/editor/resolution';
import type { PaperTypstMeta } from '$lib/helpers/paperTypst';
import { m } from '$lib/paraglide/messages';
import { translatePaperType } from '$lib/utils/enumTranslations';
import { paperEntityName } from '../paperDisplay';

/** The fields of a paper its export reads. */
export interface ExportablePaper {
	id: string;
	type: PapertypeEnum;
	conference: { title: string | null };
	agendaItem: { title: string; committee: { name: string; abbreviation: string } } | null;
	delegation: {
		assignedNation: { alpha3Code: string } | null;
		assignedNonStateActor: { name: string } | null;
	};
}

/** "General Assembly (GA)", or just the name without an abbreviation. */
export function committeeLine(committee: { name: string; abbreviation: string } | undefined) {
	if (!committee?.name) return undefined;
	return committee.abbreviation ? `${committee.name} (${committee.abbreviation})` : committee.name;
}

/** Text-only Typst document metadata for position and introduction papers. */
export function paperTypstMeta(paper: ExportablePaper): PaperTypstMeta {
	const conferenceName = paper.conference.title ?? 'Model UN';
	return {
		conferenceName,
		paperType: translatePaperType(paper.type),
		entityName: paperEntityName(paper.delegation),
		committeeLine: committeeLine(paper.agendaItem?.committee),
		committeeLabel: m.committee(),
		topic: paper.agendaItem?.title,
		topicLabel: m.resolutionTopic().replace(':', ''),
		disclaimer: m.paperPrintDisclaimer({ conferenceName })
	};
}

/**
 * How a paper is exported: working papers as a resolution under the header the editor shows,
 * every other paper as a text document. `docNumber` is the base of the file name: the
 * resolution's document number, otherwise a type/year/id stub.
 */
export type PaperExportJob =
	| { kind: 'resolution'; header: ResolutionHeaderData; docNumber: string | undefined }
	| { kind: 'paper'; meta: PaperTypstMeta; docNumber: string };

export function paperExportJob(
	paper: ExportablePaper,
	resolutionHeaderData: ResolutionHeaderData | undefined
): PaperExportJob {
	if (paper.type === 'WORKING_PAPER') {
		return {
			kind: 'resolution',
			header: resolutionHeaderData ?? {},
			docNumber: resolutionHeaderData?.documentNumber
		};
	}
	return {
		kind: 'paper',
		meta: paperTypstMeta(paper),
		docNumber: `${paper.type}/${new Date().getFullYear()}/${paper.id.slice(-6)}`
	};
}
