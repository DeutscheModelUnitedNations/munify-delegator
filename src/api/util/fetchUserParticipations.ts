import { PermissionCheckError } from '$api/auth/permissions';
import { db } from '$db/db';
import type { Conference, User } from '@prisma/client';

/**
 * This helper fetches user participations in a conference. Fetched entities include
 * the conference supervisor, single participant, team member and delegation member.
 * Optionally it can throw an appropriate error message whenever a participation is found.
 * This can be helpful when performing state checks in handlers which cannot be covered by our permissions.
 */
export async function fetchUserParticipations({
	conferenceId,
	userId,
	throwIfAnyIsFound = false
}: {
	conferenceId: Conference['id'];
	userId: User['id'];
	throwIfAnyIsFound?: boolean;
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

	if (throwIfAnyIsFound) {
		if (foundSupervisor) {
			throw new PermissionCheckError('You are already a supervisor in this conference');
		}

		if (foundSingleParticipant) {
			throw new PermissionCheckError('You are already a single participant in this conference');
		}

		if (foundDelegationMember) {
			throw new PermissionCheckError('You are already a delegation member in this conference');
		}

		if (foundTeamMember) {
			throw new PermissionCheckError('You are already a team member in this conference');
		}
	}

	return {
		foundSupervisor,
		foundSingleParticipant,
		foundDelegationMember,
		foundTeamMember
	};
}
