import type { ChasePaper } from './adoptedResolutions';
import type { ChaseClient } from './chaseRemote';
import { liveTable, type Gate, type LiveResult } from './liveTable';

/**
 * Watches what DELEGATOR reads back of one conference from the linked CHASE
 * (`docs/plans/chase-link.md`), each table with its own live queries (`liveTable`): the adopted
 * resolutions (the final papers and the snapshots their votes took, without the texts). A change
 * answers with the rows of the one table it touched. Presence is not watched: the import page asks
 * CHASE for it when it opens (`fetchChasePresence`).
 */
export function watchChaseTables({
	remote,
	conferenceId,
	onResolutions,
	onError,
	gate
}: {
	remote: ChaseClient;
	conferenceId: string;
	onResolutions: () => void;
	onError: (error: unknown) => void;
	gate: Gate;
}) {
	type PageArgs = { limit: number; offset: number; orderBy: { id: 'asc' } };
	const table = <Row extends { id: string }, Where>({
		where,
		live,
		read,
		onChange
	}: {
		where: Where;
		live: (args: PageArgs & { where: Where }) => LiveResult<readonly Row[] | null | undefined>;
		read: (args: { where: Where & { id: { in: string[] } } }) => PromiseLike<readonly Row[]>;
		onChange: () => void;
	}) =>
		liveTable<Row>({
			watchPage: (page) => live({ ...page, where }),
			readIds: (ids) => read({ where: { ...where, id: { in: ids } } }),
			onChange,
			onError,
			gate
		});

	const ofCommittees = { committee: { conferenceId: { eq: conferenceId } } };

	const PAPER = {
		title: true,
		documentNumber: true,
		committeeId: true,
		agendaItemId: true,
		vote: { id: true, outcome: true }
	} as const;
	const SNAPSHOT = { paperId: true, createdAt: true } as const;

	const resolutions = {
		papers: table({
			where: { status: 'FINAL' as const, ...ofCommittees },
			live: (args) => remote.liveQuery.resolutionPapers({ __args: args, ...PAPER }),
			read: (args) => remote.query.resolutionPapers({ __args: args, ...PAPER }),
			onChange: onResolutions
		}),
		// a concluded vote takes a snapshot of the text
		snapshots: table({
			where: { trigger: 'VOTE_CONCLUDED' as const, paper: ofCommittees },
			live: (args) => remote.liveQuery.paperContentSnapshots({ __args: args, ...SNAPSHOT }),
			read: (args) => remote.query.paperContentSnapshots({ __args: args, ...SNAPSHOT }),
			onChange: () => snapshotsChanged()
		})
	};

	/** Papers a snapshot named that the papers table did not hold, and was asked again for. */
	const askedFor = new Set<string>();
	/**
	 * A paper turns final as its vote concludes: a list of final papers hears changes to the papers it
	 * shows, not of one coming into it, but the snapshot the vote takes is new and heard. So a
	 * snapshot naming a paper the table does not hold asks for the papers again, once per paper.
	 */
	function snapshotsChanged() {
		const { papers, snapshots } = resolutions;
		if (papers.ready() && snapshots.ready()) {
			const held = new Set(papers.rows().map((paper) => paper.id));
			const missing = snapshots
				.rows()
				.map((snapshot) => snapshot.paperId)
				.filter((paperId) => !held.has(paperId) && !askedFor.has(paperId));
			if (missing.length > 0) {
				for (const paperId of missing) askedFor.add(paperId);
				papers.refresh();
			}
		}
		onResolutions();
	}
	const all = Object.values(resolutions);

	return {
		resolutionsReady: () => Object.values(resolutions).every((t) => t.ready()),
		/** The final papers with the snapshots their votes took. */
		papers: (): ChasePaper[] => {
			const snapshotsOf = Map.groupBy(resolutions.snapshots.rows(), (row) => row.paperId);
			return resolutions.papers.rows().map((paper) => ({
				...paper,
				snapshots: snapshotsOf.get(paper.id) ?? []
			}));
		},
		/** Asks every table again from scratch, after a reconnect. */
		refresh: () => {
			for (const t of all) t.refresh();
		},
		stop: () => {
			for (const t of all) t.stop();
		}
	};
}

export type ChaseTables = ReturnType<typeof watchChaseTables>;
