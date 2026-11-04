/**
 * Where a participant goes in the linked MUNify CHASE (`docs/plans/chase-link.md`): their
 * committee, or the conference for those without a seat in one, and the manual for their role.
 * Shared by the CHASE mail and the dashboard's CHASE card. CHASE picks the reader's language
 * itself, so the links carry none.
 */

export type ChaseRole = 'DELEGATE' | 'NSA' | 'SPECTATOR';

type RoleKind = 'NATION' | 'NON_STATE_ACTOR' | 'CUSTOM';
type ChaseAccess = 'SPECTATOR' | 'TEAM' | 'NONE';

/**
 * What a seat is in CHASE: a nation's seat in a committee makes a delegate, a non-state actor an
 * NSA, a custom role whatever access it gives (none: not in CHASE). `null` for no part there.
 */
export function chaseRoleOf({
	role,
	committeeId
}: {
	role: { kind: RoleKind; chaseAccess: ChaseAccess } | null | undefined;
	committeeId: string | null | undefined;
}): ChaseRole | null {
	if (!role) return null;
	if (role.kind === 'NATION') return committeeId ? 'DELEGATE' : null;
	if (role.kind === 'NON_STATE_ACTOR') return 'NSA';
	return role.chaseAccess === 'NONE' ? null : 'SPECTATOR';
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
		app:
			role === 'DELEGATE' && committeeId
				? `${base}/app/${conferenceId}/${committeeId}`
				: `${base}/app/${conferenceId}`,
		manual: `${base}/docs/${MANUAL_PAGES[role]}`
	};
}
