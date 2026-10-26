import { db, schema } from '#api/db/db.js';
import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	assertAllowedRow,
	assertCustomRolesOf,
	assertTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	maskedUntilRelease,
	onceReleased,
	PARTICIPANT_CARE_ROLES,
	SINGLE_PARTICIPANT_ASSIGNMENT,
	systemAdmin,
	userId,
	where
} from '#api/services/authHelper.js';
import type { Context } from '#api/context.js';
import { assertFindFirstExists } from '@m1212e/rumble';

/** The single participants the caller supervises. */
function supervisedParticipant(ctx: Context) {
	const id = userId(ctx);
	return id ? { supervisors: { user: { id } } } : undefined;
}

export function registerSingleParticipantAbilities() {
	// Ported from abilities/entities/singleParticipant.ts
	abilityBuilder.singleParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see their own entry - the role they were given only once the team has released the
	// assignment.
	abilityBuilder.singleParticipant
		.allow('read')
		.when((ctx) => maskedUntilRelease(isOwnUser(ctx), SINGLE_PARTICIPANT_ASSIGNMENT));
	abilityBuilder.singleParticipant.allow('read').when((ctx) => onceReleased(isOwnUser(ctx)));

	// Participant care and project management see and manage their conference's participants.
	abilityBuilder.singleParticipant
		.allow(['read', 'update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

	// Users may change their own entry only until they have applied.
	abilityBuilder.singleParticipant.allow(['update', 'delete']).when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { user: { id }, applied: false } } : undefined;
	});

	// Supervisors see the participants they supervise, with their role once it is released.
	abilityBuilder.singleParticipant
		.allow('read')
		.when((ctx) => maskedUntilRelease(supervisedParticipant(ctx), SINGLE_PARTICIPANT_ASSIGNMENT));
	abilityBuilder.singleParticipant
		.allow('read')
		.when((ctx) => onceReleased(supervisedParticipant(ctx)));
}

/**
 * Refuses unless the caller may update the single participant (the row's update ability) and
 * every role it is to apply for is one of its conference's.
 */
export async function assertCanUpdateSingleParticipant(
	ctx: ApiContext,
	id: string,
	applyForRolesIdList: readonly string[]
) {
	// Checked up front: the role changes go to the join table directly, so an update that matched
	// no row would otherwise not stop them.
	const target = await db.query.singleParticipant
		.findFirst({
			...(await ctx.abilities.singleParticipant.filter('update')).merge({ where: { id } }).query
				.single,
			columns: { id: true },
			with: { participant: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);
	await assertCustomRolesOf(target.participant.conferenceId, applyForRolesIdList);
}

/** Refuses unless the caller may delete the single participant (the row's delete ability). */
export async function assertCanDeleteSingleParticipant(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.singleParticipant,
		(await ctx.abilities.singleParticipant.filter('delete')).merge({ where: { id } }).sql.where
	);
}

/** The roles a single participant applies for have to be the conference's. */
export { assertCustomRolesOf };

/**
 * Assigning a user directly as a single participant is participant care's, and the role has to be
 * one of the conference's.
 */
export async function assertCanCreateAppliedSingleParticipant(
	ctx: ApiContext,
	conferenceId: string,
	roleId: string
) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
	await assertCustomRolesOf(conferenceId, [roleId]);
}
