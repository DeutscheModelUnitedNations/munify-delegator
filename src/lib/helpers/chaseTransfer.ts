/**
 * Why an accepted working paper does not reach the linked MUNify CHASE, decided by the rule CHASE
 * applies when it takes papers over (its `workingPapers.ts`): a draft there is written by the
 * delegation's seat in the agenda item's committee, so a paper needs an agenda item and a
 * delegation whose role that committee seats (non-state actors hold no committee seat).
 * `null` when it goes across.
 */
export type ChaseTransferIssue = 'noAgendaItem' | 'noSeat';

export function chaseTransferIssue({
	agendaItem,
	assignedRoleId
}: {
	agendaItem: { committee: { roles: readonly { id: string }[] } } | null | undefined;
	assignedRoleId: string | null | undefined;
}): ChaseTransferIssue | null {
	if (!agendaItem) return 'noAgendaItem';
	if (!assignedRoleId || !agendaItem.committee.roles.some((role) => role.id === assignedRoleId)) {
		return 'noSeat';
	}
	return null;
}

interface TransferPaper {
	id: string;
	agendaItem:
		| {
				title: string;
				committee: { abbreviation: string; roles: readonly { id: string }[] };
		  }
		| null
		| undefined;
	delegation: {
		assignedRoleId: string | null | undefined;
		assignedRole: { name?: string | null; nationAlpha3Code?: string | null } | null | undefined;
	};
}

/** The papers that do not reach CHASE, each with a label (role, agenda item) and why. */
export function keptBackPapers(papers: readonly TransferPaper[]) {
	return papers.flatMap((paper) => {
		const issue = chaseTransferIssue({
			agendaItem: paper.agendaItem,
			assignedRoleId: paper.delegation.assignedRoleId
		});
		return issue ? [{ id: paper.id, label: paperLabel(paper), issue }] : [];
	});
}

function paperLabel({ agendaItem, delegation }: TransferPaper) {
	const role = delegation.assignedRole;
	return [
		role?.name ?? role?.nationAlpha3Code,
		agendaItem && `${agendaItem.committee.abbreviation}: ${agendaItem.title}`
	]
		.filter(Boolean)
		.join(' · ');
}
