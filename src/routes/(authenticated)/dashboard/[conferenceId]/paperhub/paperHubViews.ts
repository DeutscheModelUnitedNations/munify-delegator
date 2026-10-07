/** The views the paper hub can show, in the order their tabs appear. */
const PAPER_HUB_VIEWS = ['participant', 'supervisor', 'team', 'global'] as const;
export type PaperHubView = (typeof PAPER_HUB_VIEWS)[number];

export const isPaperHubView = (value: string | null): value is PaperHubView =>
	PAPER_HUB_VIEWS.some((view) => view === value);

/** What the caller is in the conference, as far as the paper hub cares. */
export interface PaperHubAccess {
	/** A team member with review access */
	isTeamMember: boolean;
	/** A supervisor with supervised students */
	isSupervisor: boolean;
	/** Only delegation members can submit papers */
	isPaperAuthor: boolean;
	/** A single participant can only view papers, not submit them */
	isSingleParticipant: boolean;
	/** A delegation member, single participant or supervisor */
	isParticipant: boolean;
}

export function paperHubAccess(
	participation:
		| {
				delegationMember: object | null;
				singleParticipant: object | null;
				supervisor: object | null;
		  }
		| undefined,
	roles: { isReviewer: boolean; supervisor: object | null; supervisedDelegationIds: string[] }
): PaperHubAccess {
	const isDelegationMember = !!participation?.delegationMember;
	const isSingle = !!participation?.singleParticipant;
	return {
		isTeamMember: roles.isReviewer,
		isSupervisor: !!roles.supervisor && roles.supervisedDelegationIds.length > 0,
		isPaperAuthor: isDelegationMember,
		isSingleParticipant: isSingle && !isDelegationMember,
		isParticipant: isDelegationMember || isSingle || !!participation?.supervisor
	};
}

/** Which views the caller has access to. */
export function availablePaperHubViews(access: PaperHubAccess): Record<PaperHubView, boolean> {
	return {
		participant: access.isPaperAuthor,
		supervisor: access.isSupervisor,
		team: access.isTeamMember,
		global: access.isParticipant
	};
}

/**
 * The view actually shown: the requested one if the caller may see it, otherwise their most
 * specific one. Single participants only ever see the global view.
 */
export function effectivePaperHubView(
	access: PaperHubAccess,
	requested: PaperHubView
): PaperHubView {
	if (access.isSingleParticipant && !access.isTeamMember && !access.isSupervisor) return 'global';
	const available = availablePaperHubViews(access);
	if (available[requested]) return requested;
	return PAPER_HUB_VIEWS.find((view) => view !== 'global' && available[view]) ?? 'global';
}

/**
 * Whether to offer the view tabs: to anyone with more than one view, but never to single
 * participants, who only have the global view.
 */
export function showPaperHubViewToggle(access: PaperHubAccess): boolean {
	if (access.isSingleParticipant) return false;
	return (
		(access.isTeamMember && access.isParticipant) || access.isSupervisor || access.isPaperAuthor
	);
}
