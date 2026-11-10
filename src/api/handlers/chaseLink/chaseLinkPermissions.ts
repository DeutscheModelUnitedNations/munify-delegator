import { abilityBuilder, type ApiContext } from '#api/rumble';
import { apiError } from '#api/services/errors';
import { isLinkedChase, isSystemAdmin, systemAdmin } from '#api/services/authHelper/rules';
import { m } from '#lib/paraglide/messages';

export function registerInstanceLinkAbilities() {
	// Everyone reads where the link points (the dashboard links into CHASE) and when it last synced
	// (the team's CHASE card); how it fails (`lastError`) is for system admins, on the link page.
	abilityBuilder.instanceLink
		.allow('read')
		.when(() => ({ columns: { id: true, remoteUrl: true, lastReconcileAt: true } }));
	abilityBuilder.instanceLink.allow(['read', 'update', 'delete']).when(systemAdmin);
}

/**
 * Refuses (FORBIDDEN) unless the caller is a system admin or the linked CHASE itself (its link
 * token), the ones who may make the link worker read everything again (`requestLinkSync`).
 */
export function assertCanRequestLinkSync(ctx: ApiContext) {
	if (isLinkedChase(ctx)) return;
	assertSystemAdmin(ctx);
}

/**
 * Refuses (FORBIDDEN) unless the caller is a system admin: only a person asks CHASE to sync too.
 * Never the linked CHASE, so a request cannot bounce between the two instances.
 */
export function assertCanRequestRemoteLinkSync(ctx: ApiContext) {
	assertSystemAdmin(ctx);
}

function assertSystemAdmin(ctx: ApiContext) {
	ctx.mustBeLoggedIn();
	if (!isSystemAdmin(ctx)) {
		throw apiError({ code: 'FORBIDDEN', message: m.accessDeniedSystemAdmin() });
	}
}
