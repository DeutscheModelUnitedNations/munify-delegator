import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin,
	hop
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';

export function registerSchoolSuggestionAbilities() {
	// System admins read and decide every suggestion and read its variants.
	abilityBuilder.schoolSuggestion.allow(['read', 'update']).when(systemAdmin);
	abilityBuilder.schoolSuggestionVariant.allow('read').when(systemAdmin);

	// Participant care (project management and participant care) reads and decides the suggestions
	// of its conference's cleanup page, and reads their variants.
	abilityBuilder.schoolSuggestion
		.allow(['read', 'update'])
		.when(
			liveWhere((args) => isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }))
		);
	abilityBuilder.schoolSuggestionVariant.allow('read').when(
		liveWhere((args) => {
			const suggestion = isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES });
			return hop(suggestion, (suggestion) => ({ suggestion }));
		})
	);
}

/**
 * Refuses analysing a conference's schools for similar names unless the caller holds
 * `manageParticipants` (project management and participant care) in it.
 */
export async function assertCanAnalyzeSchoolSuggestions({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * The applied delegations and single participants of the conference the caller may read, as one
 * SQL `where` per table through their read abilities, for `loadSchoolRows`.
 */
export async function readableSchoolRegistrations({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
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
