import { db, schema } from '#api/db/db';
import type { ApiContext } from '#api/rumble';
import type { InferSelectModel } from 'drizzle-orm';
import { birthdayBoundsForAge, getAgeAtConference } from '#lib/helpers/ageChecker';
import { ageBands, ageIssue, type AgeBand, type AgeRole } from '#lib/helpers/plausibilityRules';
import { assertFindFirstExists } from '@m1212e/rumble';
import { invalidProfileFields } from '#lib/schemata/userForm';

export type PlausibilityUser = InferSelectModel<typeof schema.user>;

/** The caller's `read` filter on users, which decides who the plausibility lists may show. */
export type ReadableUsers = Awaited<ReturnType<ApiContext['abilities']['user']['filter']>>;

/**
 * Flags participants whose age on the first conference day does not fit the role they registered
 * for under the conference's limits (`ageIssue` in `#lib/helpers/plausibilityRules` is the same
 * rule for one person), plus those whose account data no longer satisfies the registration form.
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

	const conference = await db.query.conference
		.findFirst({
			where: { id: conferenceId },
			columns: {
				startConference: true,
				participantMinAge: true,
				participantMaxAge: true,
				supervisorMinAge: true
			}
		})
		.then(assertFindFirstExists);
	const bands = ageBands(conference);
	/** The users of `who` whose age on the first day lies in `band`; none without a band. */
	const usersAged = async ({
		who,
		band
	}: {
		who: typeof participating | typeof supervising;
		band: AgeBand | undefined;
	}): Promise<PlausibilityUser[]> => {
		if (!band) return [];
		const birthday = birthdayBoundsForAge({
			range: { gte: band.gte, lte: band.lt === undefined ? undefined : band.lt - 1 },
			startConference: conference.startConference
		});
		return db.query.user.findMany(readableUsers.merge({ where: { ...who, birthday } }).query.many);
	};

	const [tooYoungUsers, tooOldUsers, shouldBeSupervisor, shouldNotBeSupervisor, candidates] =
		await Promise.all([
			usersAged({ who: participating, band: bands.tooYoung }),
			usersAged({ who: participating, band: bands.tooOld }),
			usersAged({ who: participating, band: bands.shouldBeSupervisor }),
			usersAged({ who: supervising, band: bands.shouldNotBeSupervisor }),
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
		dataMissing: candidates.filter((user) => invalidProfileFields(user).length > 0)
	};
}

/**
 * Whether a person's age on the conference's first day fits taking part as `role`, with the limits
 * it was judged by: what the entry flows and the dashboard warn with. Nothing when it fits, or when
 * the birthday is not known yet.
 */
export async function ageNoticeFor({
	userId,
	conferenceId,
	role
}: {
	userId: string;
	conferenceId: string;
	role: AgeRole;
}) {
	const [conference, user] = await Promise.all([
		db.query.conference
			.findFirst({
				where: { id: conferenceId },
				columns: {
					startConference: true,
					participantMinAge: true,
					participantMaxAge: true,
					supervisorMinAge: true
				}
			})
			.then(assertFindFirstExists),
		db.query.user.findFirst({ where: { id: userId }, columns: { birthday: true } })
	]);
	if (!user?.birthday) return null;
	const age = getAgeAtConference({
		birthday: user.birthday,
		startConference: conference.startConference
	});
	if (age === undefined) return null;
	const issue = ageIssue({ age, role, limits: conference });
	return issue ? { issue, age, ...conference } : null;
}
