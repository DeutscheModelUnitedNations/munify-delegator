import { abilityBuilder, type ApiContext } from '#api/rumble';
import { isSystemAdmin, systemAdmin } from '#api/services/authHelper/rules';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

export function registerInstanceLinkAbilities() {
	// System admins read the link, never its tokens. Everyone reads where an active link points
	// (the dashboard links into CHASE) and when it last read back from CHASE (the team's CHASE card).
	abilityBuilder.instanceLink
		.allow('read')
		.when((ctx) =>
			isSystemAdmin(ctx)
				? { columns: { inboundTokenHash: false, outboundToken: false } }
				: undefined
		);
	abilityBuilder.instanceLink.allow('read').when(() => ({
		where: { status: 'ACTIVE' },
		columns: { id: true, remoteUrl: true, status: true, lastReconcileAt: true }
	}));
	abilityBuilder.instanceLink.allow(['update', 'delete']).when(systemAdmin);
}

/** Pairing and unlinking are a system admin's. */
export function assertCanManageChaseLink(ctx: ApiContext) {
	if (!isSystemAdmin(ctx)) {
		throw apiError({ code: 'FORBIDDEN', message: m.chaseLinkAdminsOnly() });
	}
}

/** CHASE confirming a pending request calls with the token this instance gave it. */
export async function assertPendingChaseCaller(ctx: ApiContext) {
	if ((await ctx.linkCaller())?.status !== 'PENDING') {
		throw apiError({ code: 'FORBIDDEN', message: m.chaseLinkNotPending() });
	}
}

/** Whether the linked CHASE itself is calling, as it does when it unlinks. */
export async function isLinkedChaseCaller(ctx: ApiContext) {
	return (await ctx.linkCaller())?.status === 'ACTIVE';
}
