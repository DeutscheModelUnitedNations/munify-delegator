import { db } from '#api/db/db';
import type { ApiContext } from '#api/rumble';
import { callerUserId } from '#api/services/authHelper/utils';
import { isAccountActive } from '#api/services/oidc/managementApi';
import { apiError } from '#api/services/errors';
import { rolesWithTeamPermission } from '#lib/helpers/teamRoles';
import { m } from '#lib/paraglide/messages';
import type { Deliverer } from './scannerAccessService';

/**
 * Scanner logins are personal: what a scanner delivers is what its owner might have uploaded by hand, so
 * it may do no more than they may. A page is kept where they manage the participants (project management
 * and participant care) of the conference it is of; nothing is ever read. Nobody but the owner sees or
 * changes a login. The table has no abilities: nothing reads it but the fields here, and the password's
 * hash never leaves the API. A system admin's role is in their session only, which a scanner has none of:
 * it delivers where they are on the team.
 */

/** A conference a scanner may deliver into, and its owner's place on the team there. */
export interface DeliveryConference {
	conferenceId: string;
	teamMemberId: string;
}

/**
 * The conferences whose participants somebody manages, the latest first: those their scanners may deliver
 * into. Asked anew for each delivery, so a role handed back counts at once.
 */
export async function conferencesToDeliverInto(userId: string): Promise<DeliveryConference[]> {
	const roles = rolesWithTeamPermission('manageParticipants') ?? [];
	const memberships = await db.query.teamMember.findMany({
		where: { userId, role: { in: [...roles] } },
		columns: { id: true, conferenceId: true },
		with: { conference: { columns: { startConference: true } } }
	});
	return memberships
		.toSorted((a, b) => +b.conference.startConference - +a.conference.startConference)
		.map(({ id, conferenceId }) => ({ conferenceId, teamMemberId: id }));
}

/**
 * Whether a login may deliver now: not expired, its owner managing the participants of some conference,
 * and their account not suspended. Asked at sign-in, and again for every delivery.
 */
export async function mayDeliver({ expiresAt, userId }: Pick<Deliverer, 'expiresAt' | 'userId'>) {
	if (expiresAt <= new Date()) return false;
	const conferences = await conferencesToDeliverInto(userId);
	return conferences.length > 0 && (await isAccountActive(userId));
}

/** The caller, whose logins these are; FORBIDDEN for an AI assistant. */
export function assertOwnScannerAccesses(ctx: ApiContext) {
	ctx.mustBeLoggedIn();
	const userId = callerUserId(ctx);
	if (!userId) throw apiError({ code: 'FORBIDDEN', message: m.scannerAccessNotAllowed() });
	return { userId };
}

/** Whether the caller has any use for a scanner: they manage the participants of some conference. */
export async function canUseScanners(ctx: ApiContext) {
	const userId = callerUserId(ctx);
	return userId !== undefined && (await conferencesToDeliverInto(userId)).length > 0;
}

/**
 * The caller, who makes a login; FORBIDDEN unless they manage the participants of some conference, and
 * while impersonating: a login would outlive the impersonation, in somebody else's name.
 */
export async function assertCanCreateScannerAccess(ctx: ApiContext) {
	const own = assertOwnScannerAccesses(ctx);
	if (ctx.oidc.impersonator || !(await canUseScanners(ctx))) {
		throw apiError({ code: 'FORBIDDEN', message: m.scannerAccessNotAllowed() });
	}
	return own;
}

/** Whether a login is the caller's own. */
async function isOwn({ ctx, id }: { ctx: ApiContext; id: string }) {
	const { userId } = assertOwnScannerAccesses(ctx);
	const access = await db.query.scannerAccess.findFirst({
		where: { id, userId },
		columns: { id: true }
	});
	return access !== undefined;
}

/** Refuses (NOT_FOUND) unless the scanner login is the caller's own, and they are themselves. */
export async function assertCanRenewScannerAccess({ ctx, id }: { ctx: ApiContext; id: string }) {
	if (ctx.oidc.impersonator || !(await isOwn({ ctx, id }))) {
		throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	}
}

/**
 * Refuses (NOT_FOUND) unless the scanner login is the caller's own. A system admin impersonating its
 * owner removes it for them.
 */
export async function assertCanDeleteScannerAccess({ ctx, id }: { ctx: ApiContext; id: string }) {
	if (!(await isOwn({ ctx, id }))) {
		throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
	}
}
