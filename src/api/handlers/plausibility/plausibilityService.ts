import { db, schema } from '#api/db/db';
import type { ApiContext } from '#api/rumble';
import type { InferSelectModel } from 'drizzle-orm';
import {
	PARTICIPANT_MAX_AGE,
	PARTICIPANT_MIN_AGE,
	SUPERVISOR_MIN_AGE,
	yearsAgo
} from '#lib/helpers/plausibilityRules';
import { userFormSchema } from '#lib/schemata/userForm';

export type PlausibilityUser = InferSelectModel<typeof schema.user>;

/**
 * The registration form still names these two fields the way the OIDC claims do, so a database
 * row has to be renamed into that shape before the form's schema can judge it complete.
 */
function toFormShape(user: PlausibilityUser) {
	const { givenName, familyName, ...rest } = user;
	return { ...rest, given_name: givenName, family_name: familyName };
}

/** The caller's `read` filter on users, which decides who the plausibility lists may show. */
export type ReadableUsers = Awaited<ReturnType<ApiContext['abilities']['user']['filter']>>;

/**
 * Flags participants whose age does not fit the role they registered for, plus those whose
 * account data no longer satisfies the registration form.
 */
export async function findPlausibilityIssues({
	conferenceId,
	readableUsers
}: {
	conferenceId: string;
	readableUsers: ReadableUsers;
}) {
	const participating = {
		OR: [
			{ singleParticipant: { participant: { conferenceId } } },
			{ delegationMemberships: { participant: { conferenceId } } }
		]
	};
	const supervising = { conferenceSupervisor: { participant: { conferenceId } } };

	const [tooYoungUsers, tooOldUsers, shouldBeSupervisor, shouldNotBeSupervisor, candidates] =
		await Promise.all([
			db.query.user.findMany(
				readableUsers.merge({
					where: { ...participating, birthday: { gt: yearsAgo(PARTICIPANT_MIN_AGE) } }
				}).query.many
			),
			db.query.user.findMany(
				readableUsers.merge({
					where: {
						...participating,
						birthday: { lt: yearsAgo(SUPERVISOR_MIN_AGE), gt: yearsAgo(PARTICIPANT_MAX_AGE) }
					}
				}).query.many
			),
			db.query.user.findMany(
				readableUsers.merge({
					where: { ...participating, birthday: { lt: yearsAgo(PARTICIPANT_MAX_AGE) } }
				}).query.many
			),
			db.query.user.findMany(
				readableUsers.merge({
					where: { ...supervising, birthday: { gt: yearsAgo(SUPERVISOR_MIN_AGE) } }
				}).query.many
			),
			db.query.user.findMany(
				readableUsers.merge({
					where: {
						OR: [
							{ singleParticipant: { participant: { conferenceId } } },
							{ delegationMemberships: { participant: { conferenceId } } },
							{ conferenceSupervisor: { participant: { conferenceId } } }
						]
					}
				}).query.many
			)
		]);

	return {
		tooYoungUsers,
		tooOldUsers,
		shouldBeSupervisor,
		shouldNotBeSupervisor,
		dataMissing: candidates.filter((user) => !userFormSchema.safeParse(toFormShape(user)).success)
	};
}
