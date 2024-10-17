import type { OIDC } from '$api/context/oidc';
import { db } from '$db/db';

/**
 * This helper function checks if the user is a conference admin or global admin.
 */
export async function requireToBeConferenceAdmin({
	conferenceId,
	user
}: {
	conferenceId: string;
	user: OIDC['user'];
}) {
	if (!user) {
		throw new Error('User not found');
	}

	const isAdmin = user.hasRole('admin');

	if (isAdmin) return;

	const conferenceAdminUser = await db.user.findUnique({
		where: {
			id: user.sub,
			teamMember: {
				some: {
					conferenceId,
					role: {
						in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE']
					}
				}
			}
		}
	});

	if (!!conferenceAdminUser) return;
	throw new Error('User is not a conference admin');
}
