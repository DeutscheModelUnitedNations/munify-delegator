import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';

export function registerSchoolSuggestionAbilities() {
	abilityBuilder.schoolSuggestion.allow(['read', 'update']).when(systemAdmin);
	abilityBuilder.schoolSuggestionVariant.allow('read').when(systemAdmin);

	// The cleanup page belongs to the people who manage the participants.
	abilityBuilder.schoolSuggestion
		.allow(['read', 'update'])
		.when((ctx) => grantWhere(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
	abilityBuilder.schoolSuggestionVariant.allow('read').when((ctx) => {
		const conference = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return conference ? { where: { suggestion: conference } } : undefined;
	});
}

/** Looking for similar school names is participant care's. */
export async function assertCanAnalyzeSchoolSuggestions(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'manageParticipants');
}

/**
 * The applied registrations of the conference that name a school and that the caller may read, as
 * where clauses for `loadSchoolRows`.
 */
export async function readableSchoolRegistrations(ctx: ApiContext, conferenceId: string) {
	const [delegations, singleParticipants] = await Promise.all([
		ctx.abilities.delegation.filter('read'),
		ctx.abilities.singleParticipant.filter('read')
	]);
	return {
		delegations: delegations.merge({
			where: { conferenceId, applied: true }
		}).sql.where,
		singleParticipants: singleParticipants.merge({
			where: { participant: { conferenceId }, applied: true }
		}).sql.where
	};
}

export type ReadableSchoolRegistrations = Awaited<ReturnType<typeof readableSchoolRegistrations>>;
