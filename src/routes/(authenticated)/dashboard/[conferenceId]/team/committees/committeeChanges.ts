import type { ManagedCommittee } from './types';

export type CommitteeDraft = {
	name: string;
	abbreviation: string;
	resolutionHeadline: string;
	seats: number;
};

/** The form's starting values for a stored committee. */
export function committeeDraftOf(
	committee: Pick<
		ManagedCommittee,
		'name' | 'abbreviation' | 'resolutionHeadline' | 'numOfSeatsPerDelegation'
	>
): CommitteeDraft {
	return {
		name: committee.name,
		abbreviation: committee.abbreviation,
		resolutionHeadline: committee.resolutionHeadline ?? '',
		seats: committee.numOfSeatsPerDelegation
	};
}

/**
 * What saving the committee's settings sends: only the fields edited since the form took over the
 * stored values (`base`), so a field left alone keeps what someone else may have saved meanwhile,
 * even when the form still shows the older value. Names are trimmed; an emptied resolution headline
 * clears it (`null`). `undefined` when nothing changed.
 */
export function committeeChanges({ base, draft }: { base: CommitteeDraft; draft: CommitteeDraft }) {
	const name = draft.name.trim();
	const abbreviation = draft.abbreviation.trim();
	const headline = draft.resolutionHeadline.trim();
	const changes = {
		name: name !== base.name ? name : undefined,
		abbreviation: abbreviation !== base.abbreviation ? abbreviation : undefined,
		resolutionHeadline: headline !== base.resolutionHeadline ? headline || null : undefined,
		numOfSeatsPerDelegation: draft.seats !== base.seats ? draft.seats : undefined
	};
	return Object.values(changes).some((value) => value !== undefined) ? changes : undefined;
}

/** Whether a draft can be saved: a name, an abbreviation and at least one seat. */
export function committeeDraftValid(draft: CommitteeDraft) {
	return !!draft.name.trim() && !!draft.abbreviation.trim() && draft.seats >= 1;
}

/** The server refuses to delete a committee with delegates or papers (`assertCommitteeDeletable`). */
export function committeeDeletable(
	committee: Pick<ManagedCommittee, 'delegationMembers' | 'agendaItems'>
) {
	return (
		committee.delegationMembers.length === 0 &&
		committee.agendaItems.every((item) => item.papers.length === 0)
	);
}

/** The agenda items of a committee that have no points for discussion yet. */
export function agendaItemsWithoutPoints(committee: Pick<ManagedCommittee, 'agendaItems'>) {
	return committee.agendaItems.filter((item) => item.discussionPoints.length === 0).length;
}

/**
 * Committees in the order they were created, ties (a seed creates several at once) by id: the
 * database's order of equal timestamps can change between two answers, and the committee shown
 * without one named in the URL is the first.
 */
export function inCreationOrder<C extends { id: string; createdAt: Date }>(
	committees: readonly C[]
) {
	return [...committees].sort(
		(a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
	);
}

/** The committee to show: the one the URL names, else the first one. */
export function selectedCommittee<C extends { id: string }>({
	committees,
	id
}: {
	committees: readonly C[];
	id: string | null | undefined;
}): C | undefined {
	return committees.find((committee) => committee.id === id) ?? committees[0];
}
