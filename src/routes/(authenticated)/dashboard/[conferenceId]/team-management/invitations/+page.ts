import { client } from '$lib/api/rumbleClient/client';
import type { PageLoad } from './$types';

/** Invitations that are still open: neither accepted nor withdrawn. */
export const load: PageLoad = async (event) => {
	return {
		invitations: await client.query.teamMemberInvitations({
			__args: {
				where: {
					conferenceId: { eq: event.params.conferenceId },
					usedAt: { isNull: true },
					revokedAt: { isNull: true }
				}
			},
			id: true,
			email: true,
			role: true,
			expiresAt: true,
			userExists: true,
			invitedBy: { givenName: true, familyName: true }
		})
	};
};
