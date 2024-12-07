import { db } from '$db/db';
import { languageTag } from '$lib/paraglide/runtime';
import type { Conference, User } from '@prisma/client';
import * as m from '$lib/paraglide/messages';
import { GraphQLError } from 'graphql';

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
			throw new GraphQLError(m.youAreAlreadySupervisor({}, { languageTag: languageTag() }));
		}

		if (foundSingleParticipant) {
			throw new GraphQLError(m.youAreAlreadySingleParticipant({}, { languageTag: languageTag() }));
		}

		if (foundDelegationMember) {
			throw new GraphQLError(m.youAreAlreadyDelegationMember({}, { languageTag: languageTag() }));
		}

		if (foundTeamMember) {
			throw new GraphQLError(m.youAreAlreadyTeamMember({}, { languageTag: languageTag() }));
		}
	}

	return {
		foundSupervisor,
		foundSingleParticipant,
		foundDelegationMember,
		foundTeamMember
	};
}
