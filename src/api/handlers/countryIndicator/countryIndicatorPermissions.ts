import type { ApiContext } from '#api/rumble';

/**
 * Who may read the country information's World Bank figures: everybody signed in. They are public
 * data, nobody's; the sign-in only keeps the server from being an open proxy to the World Bank.
 * They have no table, so no abilities.
 */
export function assertCanReadCountryIndicators(ctx: ApiContext) {
	ctx.mustBeLoggedIn();
}
