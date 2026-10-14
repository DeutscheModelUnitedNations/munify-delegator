import { abilityBuilder, type ApiContext } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';

export function registerSchoolSuggestionAbilities() {
	abilityBuilder.schoolSuggestion.allow(['read', 'update']).when(systemAdmin);
	abilityBuilder.schoolSuggestionVariant.allow('read').when(systemAdmin);

	// The cleanup page belongs to the people who manage the participants.
	abilityBuilder.schoolSuggestion
		.allow(['read', 'update'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
	abilityBuilder.schoolSuggestionVariant.allow('read').when((ctx) => {
		const conference = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return conference ? { where: { suggestion: conference } } : undefined;
	});
}

/** Looking for similar school names is participant care's. */
export async function assertCanAnalyzeSchoolSuggestions(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}

/**
 * The suggestion if the caller may update it (the row's update ability), as a where-clause: a
 * dismissal the caller may not make changes nothing.
 */
export async function updatableSchoolSuggestion(ctx: ApiContext, id: string) {
	return (await ctx.abilities.schoolSuggestion.filter('update')).merge({ where: { id } }).sql.where;
}

/**
 * The applied registrations of the conference that name a school and that the caller may read, as
 * queries for `loadSchoolRows`.
 */
export async function readableSchoolRegistrations(ctx: ApiContext, conferenceId: string) {
	const [delegations, singleParticipants] = await Promise.all([
		ctx.abilities.delegation.filter('read'),
		ctx.abilities.singleParticipant.filter('read')
	]);
	return {
		delegations: delegations.merge({
			where: { conferenceId, applied: true, school: { isNotNull: true } }
		}).query.many,
		singleParticipants: singleParticipants.merge({
			where: { conferenceId, applied: true, school: { isNotNull: true } }
		}).query.many
	};
}

export type ReadableSchoolRegistrations = Awaited<ReturnType<typeof readableSchoolRegistrations>>;
