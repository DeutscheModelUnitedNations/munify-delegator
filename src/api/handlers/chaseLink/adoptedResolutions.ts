import {
	ResolutionSchema,
	type Resolution
} from '@deutschemodelunitednations/munify-resolution-editor/schema';

/**
 * Which of the linked CHASE's papers are adopted resolutions here (`docs/plans/chase-link.md`),
 * and what the link worker has to do about them. A paper counts once its final vote adopted it;
 * its text is the snapshot taken when that vote was concluded (the latest, should a chair have
 * concluded it twice). A resolution is rendered again only when that snapshot changes.
 */

export interface ChasePaper {
	id: string;
	title?: string | null;
	documentNumber?: string | null;
	committeeId: string;
	agendaItemId: string;
	vote?: { outcome?: 'ADOPTED' | 'REJECTED' | null } | null;
	snapshots: readonly { id: string; content: string; createdAt: Date | string }[];
}

export interface AdoptedResolution {
	paperId: string;
	snapshotId: string;
	title: string | undefined;
	documentNumber: string | undefined;
	committeeId: string;
	agendaItemId: string;
	content: Resolution;
}

/** The text of a snapshot, or undefined when it is not a resolution this editor can print. */
function parseContent(content: string): Resolution | undefined {
	try {
		const parsed = ResolutionSchema.safeParse(JSON.parse(content));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

export function adoptedResolutions(papers: readonly ChasePaper[]): AdoptedResolution[] {
	return papers.flatMap((paper) => {
		if (paper.vote?.outcome !== 'ADOPTED') return [];
		const snapshot = paper.snapshots.toSorted(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
		)[0];
		const content = snapshot && parseContent(snapshot.content);
		if (!snapshot || !content) return [];
		return [
			{
				paperId: paper.id,
				snapshotId: snapshot.id,
				title: paper.title?.trim() || undefined,
				documentNumber: paper.documentNumber?.trim() || undefined,
				committeeId: paper.committeeId,
				agendaItemId: paper.agendaItemId,
				content
			}
		];
	});
}

/**
 * What changes against the resolutions the link made before: the adopted ones to render (new, or
 * with a newer text) and the resolutions whose paper is no longer adopted.
 */
export function resolutionChanges({
	adopted,
	existing
}: {
	adopted: readonly AdoptedResolution[];
	existing: readonly { id: string; chasePaperId: string; chaseSnapshotId: string | null }[];
}) {
	const byPaper = new Map(existing.map((row) => [row.chasePaperId, row]));
	const adoptedPapers = new Set(adopted.map((resolution) => resolution.paperId));
	return {
		render: adopted.filter(
			(resolution) => byPaper.get(resolution.paperId)?.chaseSnapshotId !== resolution.snapshotId
		),
		remove: existing.filter((row) => !adoptedPapers.has(row.chasePaperId)).map((row) => row.id)
	};
}
