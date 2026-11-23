import { db } from '#api/db/db';
import type { ApiContext } from '#api/rumble';
import { assertTeamPermission, hasTeamPermission } from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { isAccountActive } from '#api/services/oidc/managementApi';
import { apiError } from '#api/services/errors';
import { rolesWithTeamPermission } from '#lib/helpers/teamRoles';
import { m } from '#lib/paraglide/messages';
import type { Deliverer } from './scannerAccessService';

/**
 * Scanner logins are personal: each belongs to a team member who manages the conference's
 * participants (project management and participant care), who alone makes and renews it. The
 * conference's project management (`manageConference`) sees whose there are and removes any. The
 * table has no abilities: nothing reads it but the fields here, and the password's hash never
 * leaves the API. A system admin who is on no team has no scanner either.
 */

/** Whether a team role may manage the conference's participants, and so deliver scans. */
const mayDeliverScans = (role: string) =>
	(rolesWithTeamPermission('manageParticipants') ?? []).some((allowed) => allowed === role);

/**
 * Whether a login may deliver now: not expired, its owner still caring for the conference's
 * participants, and their account not suspended. Asked at sign-in, and again for every delivery.
 */
export async function mayDeliver({ role, expiresAt, userId }: Deliverer) {
	return mayDeliverScans(role) && expiresAt > new Date() && (await isAccountActive(userId));
}

/**
 * The caller's own membership of the conference's team; FORBIDDEN unless it lets them manage its
 * participants, and for an AI assistant.
 */
export async function assertOwnScannerTeamMember({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	ctx.mustBeLoggedIn();
	const userId = callerUserId(ctx);
	const member = userId
		? await db.query.teamMember.findFirst({
				where: { conferenceId, userId },
				columns: { id: true, role: true }
			})
		: undefined;
	if (!member || !mayDeliverScans(member.role)) {
		throw apiError({ code: 'FORBIDDEN', message: m.scannerAccessNotAllowed() });
	}
	return { teamMemberId: member.id };
}

/**
 * Like `assertOwnScannerTeamMember`, and FORBIDDEN while impersonating: a login would outlive the
 * impersonation, in somebody else's name.
 */
export async function assertCanCreateScannerAccess({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	if (ctx.oidc.impersonator) {
		throw apiError({ code: 'FORBIDDEN', message: m.scannerAccessNotAllowed() });
	}
	return assertOwnScannerTeamMember({ ctx, conferenceId });
}

/** A login's owner and conference; NOT_FOUND for one that does not exist. */
async function ownerOf(id: string) {
	const access = await db.query.scannerAccess.findFirst({
		where: { id },
		columns: { teamMemberId: true }
	});
	const owner =
		access &&
		(await db.query.teamMember.findFirst({
			where: { id: access.teamMemberId },
			columns: { userId: true, conferenceId: true }
		}));
	if (!owner) throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
	return owner;
}

/** Refuses (NOT_FOUND) unless the scanner login is the caller's own, and they are themselves. */
export async function assertCanRenewScannerAccess({ ctx, id }: { ctx: ApiContext; id: string }) {
	ctx.mustBeLoggedIn();
	const { userId } = await ownerOf(id);
	if (userId !== callerUserId(ctx) || ctx.oidc.impersonator) {
		throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	}
}

/**
 * Refuses (NOT_FOUND) unless the scanner login is the caller's own, or of a conference they manage
 * (`manageConference`, project management).
 */
export async function assertCanDeleteScannerAccess({ ctx, id }: { ctx: ApiContext; id: string }) {
	ctx.mustBeLoggedIn();
	const { userId, conferenceId } = await ownerOf(id);
	if (userId === callerUserId(ctx)) return;
	if (await hasTeamPermission({ ctx, conferenceId, permission: 'manageConference' })) return;
	throw apiError({ code: 'NOT_FOUND', message: m.deleteNotFoundOrForbidden() });
}

/** Refuses (FORBIDDEN) unless the caller manages the conference (project management). */
export async function assertCanSeeTeamScannerAccesses({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageConference' });
}
