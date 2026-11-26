import { abilityBuilder, type ApiContext } from '#api/rumble';
import { isSystemAdmin, systemAdmin } from '#api/services/authHelper/rules';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * Conference series (MUN-SH, MUNBW) are kept by system admins. Their names are no secret: anyone
 * reads them, as the conference settings and the guide's scopes show them.
 */
export function registerConferenceSeriesAbilities() {
	abilityBuilder.conferenceSeries.allow('read');
	abilityBuilder.conferenceSeries.allow(['update', 'delete']).when(systemAdmin);
}

/** Refuses (FORBIDDEN) anybody but a system admin. */
export function assertCanManageConferenceSeries(ctx: ApiContext) {
	ctx.mustBeLoggedIn();
	if (ctx.mcp || !isSystemAdmin(ctx)) {
		throw apiError({ code: 'FORBIDDEN', message: m.accessDeniedSystemAdmin() });
	}
}
