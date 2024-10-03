import { db } from '$db/db';
import type { languageTag } from '$lib/paraglide/runtime';
import type { Conference, User } from '@prisma/client';
import * as m from '$lib/paraglide/messages';
import { PermissionCheckError } from '$api/util/logger';
import type { OIDCDeriveType } from '$api/auth/oidcPlugin';

/**
 * This helper
 */
export async function requireToBeConferenceAdmin({
	conferenceId,
	user
}: {
	conferenceId: string;
	user: OIDCDeriveType['user'];
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
	throw new PermissionCheckError('User is not a conference admin');
}
