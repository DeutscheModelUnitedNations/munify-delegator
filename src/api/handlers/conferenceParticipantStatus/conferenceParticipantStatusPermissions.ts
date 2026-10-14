import { schema } from '$api/db/db';
import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	assertAllowedRow,
	assertTeamRole,
	assertUserInConference,
	isOwnUser,
	isTeamMemberOfConference,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import { m } from '$lib/paraglide/messages';

export function registerConferenceParticipantStatusAbilities() {
	// Ported from abilities/entities/conferenceParticipantStatus.ts
	abilityBuilder.conferenceParticipantStatus.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own status.
	abilityBuilder.conferenceParticipantStatus.allow('read').when((ctx) => where(isOwnUser(ctx)));

	// Supervisors see the status of the participants they supervise, in the conference they supervise
	// them in.
	abilityBuilder.conferenceParticipantStatus.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? {
					where: {
						conference: { conferenceSupervisors: { user: { id } } },
						user: {
							OR: [
								{ delegationMemberships: { supervisors: { user: { id } } } },
								{ singleParticipant: { supervisors: { user: { id } } } }
							]
						}
					}
				}
			: undefined;
	});

	// Delegation members see the status of their co-delegates.
	abilityBuilder.conferenceParticipantStatus.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? {
					where: {
						user: { delegationMemberships: { delegation: { members: { user: { id } } } } }
					}
				}
			: undefined;
	});

	// Participant care and project management manage their conference's statuses.
	abilityBuilder.conferenceParticipantStatus
		.allow(['read', 'update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
}

/** Refuses unless the caller's `update` ability reaches the status row `id`. */
export async function assertCanUpdateParticipantStatus(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.conferenceParticipantStatus,
		(await ctx.abilities.conferenceParticipantStatus.filter('update')).merge({ where: { id } }).sql
			.where,
		m.updateNotFoundOrForbidden
	);
}

/**
 * Refuses to create a status row unless the caller is the conference's participant care, and the
 * user actually belongs to the conference. There is no row for the update ability to judge yet.
 */
export async function assertCanCreateParticipantStatus(
	ctx: ApiContext,
	conferenceId: string,
	userId: string
) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	await assertUserInConference(conferenceId, userId);
}

/** The bulk attendance toggle is for the conference's participant care. */
export async function assertCanSetAttendanceForAll(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}
