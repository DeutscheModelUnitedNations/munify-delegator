/**
 * Where a participant goes in the linked MUNify CHASE (`docs/plans/chase-link.md`): their
 * committee, or the conference for those without a seat in one, and the manual for their role.
 * Shared by the CHASE mail and the dashboard's CHASE card. CHASE picks the reader's language
 * itself, so the links carry none.
 */

import { CHASE_INTRO_REMINDER_DAYS } from '#lib/helpers/emailKinds';

export type ChaseRole = 'DELEGATE' | 'NSA' | 'SPECTATOR';

type RoleKind = 'NATION' | 'NON_STATE_ACTOR' | 'CUSTOM';

/**
 * What a seat is in CHASE: a nation's seat in a committee makes a delegate, a non-state actor an
 * NSA, a custom role a spectator. `null` for no part there.
 */
export function chaseRoleOf({
	role,
	committeeId
}: {
	role: { kind: RoleKind } | null | undefined;
	committeeId: string | null | undefined;
}): ChaseRole | null {
	if (!role) return null;
	if (role.kind === 'NATION') return committeeId ? 'DELEGATE' : null;
	if (role.kind === 'NON_STATE_ACTOR') return 'NSA';
	return 'SPECTATOR';
}

const MANUAL_PAGES: Record<ChaseRole, string> = {
	DELEGATE: 'user-manual/participant/getting-started',
	NSA: 'user-manual/participant/attendance',
	SPECTATOR: 'user-manual/roles-overview'
};

export function chaseLinks({
	chaseUrl,
	conferenceId,
	committeeId,
	role
}: {
	chaseUrl: string;
	conferenceId: string;
	committeeId: string | null | undefined;
	role: ChaseRole;
}) {
	const base = chaseUrl.replace(/\/+$/, '');
	return {
		/** CHASE's conference selection, which lists each signed-in person their conferences. */
		launcher: `${base}/app`,
		app:
			role === 'DELEGATE' && committeeId
				? `${base}/app/${conferenceId}/${committeeId}`
				: `${base}/app/${conferenceId}`,
		manual: `${base}/docs/${MANUAL_PAGES[role]}`
	};
}

type Seat = { kind: RoleKind } | null | undefined;

/**
 * Where a participant goes in CHASE, from their delegation membership or single participation:
 * their role there and its links. Undefined for no part there.
 */
export function chasePlaceOf({
	chaseUrl,
	conferenceId,
	member,
	single
}: {
	chaseUrl: string;
	conferenceId: string;
	member?: { assignedCommittee?: { id: string } | null; delegation: { assignedRole?: Seat } };
	single?: { assignedRole?: Seat };
}) {
	const committeeId = member?.assignedCommittee?.id ?? null;
	const role = chaseRoleOf({
		role: member?.delegation.assignedRole ?? single?.assignedRole,
		committeeId
	});
	if (!role) return undefined;
	return { role, links: chaseLinks({ chaseUrl, conferenceId, committeeId, role }) };
}

/**
 * Whether the CHASE card is unlocked: from the day the intro mail's window opens
 * (`CHASE_INTRO_REMINDER_DAYS` before the conference starts), and for as long as the conference runs.
 */
export function chaseIntroOpen({
	startConference,
	now = new Date()
}: {
	startConference: Date | string | null | undefined;
	now?: Date;
}) {
	if (!startConference) return false;
	const start = new Date(startConference).getTime();
	return now.getTime() >= start - CHASE_INTRO_REMINDER_DAYS * 24 * 60 * 60 * 1000;
}
