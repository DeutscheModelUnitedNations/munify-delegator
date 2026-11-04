import type { ApiContext } from '#api/rumble';
import { isLinkedChase } from '#api/services/authHelper/rules';

/**
 * The public key is public by nature, but only handed to signed-in callers and the linked CHASE,
 * whose scanner checks nametags and cards with it (UNAUTHENTICATED otherwise).
 */
export async function assertCanReadIdentityKey(ctx: ApiContext) {
	if (await isLinkedChase(ctx)) return;
	ctx.mustBeLoggedIn();
}
