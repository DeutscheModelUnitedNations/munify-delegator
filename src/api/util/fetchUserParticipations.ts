import { db } from '$db/db';
import type { languageTag } from '$lib/paraglide/runtime';
import type { Conference, User } from '@prisma/client';
import * as m from '$lib/paraglide/messages';
import { PermissionCheckError } from './logger';

/**
 * This helper fetches user participations in a conference. Fetched entities include
 * the conference supervisor, single participant, team member and delegation member.
 * Optionally it can throw an appropriate error message whenever a participation is found.
 * This can be helpful when performing state checks in handlers which cannot be covered by our permissions.
 */
export async function fetchUserParticipations({
	conferenceId,
	userId,
	throwIfAnyIsFound
}: {
	conferenceId: Conference['id'];
	userId: User['id'];
	throwIfAnyIsFound?: { languageTag: ReturnType<typeof languageTag> };
}) {
	const [foundSupervisor, foundSingleParticipant, foundDelegationMember, foundTeamMember] =
		await Promise.all([
			db.conferenceSupervisor.findUnique({
				where: {
					conferenceId_userId: {
						userId,
						conferenceId
					}
				}
			}),
			db.singleParticipant.findUnique({
				where: {
					conferenceId_userId: {
						userId,
						conferenceId
					}
				}
			}),
			db.delegationMember.findUnique({
				where: {
					conferenceId_userId: {
						userId,
						conferenceId
					}
				}
			}),
			db.teamMember.findUnique({
				where: {
					conferenceId_userId: {
						userId,
						conferenceId
					}
				}
			})
		]);

	if (throwIfAnyIsFound?.languageTag) {
		if (foundSupervisor) {
			throw new PermissionCheckError(
				m.youAreAlreadySupervisor({}, { languageTag: throwIfAnyIsFound.languageTag })
			);
		}

		if (foundSingleParticipant) {
			throw new PermissionCheckError(
				m.youAreAlreadySingleParticipant({}, { languageTag: throwIfAnyIsFound.languageTag })
			);
		}

		if (foundDelegationMember) {
			throw new PermissionCheckError(
				m.youAreAlreadyDelegationMember({}, { languageTag: throwIfAnyIsFound.languageTag })
			);
		}

		if (foundTeamMember) {
			throw new PermissionCheckError(
				m.youAreAlreadyTeamMember({}, { languageTag: throwIfAnyIsFound.languageTag })
			);
		}
	}

	return {
		foundSupervisor,
		foundSingleParticipant,
		foundDelegationMember,
		foundTeamMember
	};
}
