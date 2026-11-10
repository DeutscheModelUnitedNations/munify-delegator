import { db } from '#api/db/db';
import { schemaBuilder, type ApiContext } from '#api/rumble';
import { UserRef } from '#api/handlers/user/user';
import { ageNoticeFor, findPlausibilityIssues, type PlausibilityUser } from './plausibilityService';
import { assertCanReadPlausibility, ownAgeNoticeUser } from './plausibilityPermissions';
import {
	prospectiveSupervisorPeople,
	type ApplicationPeople
} from '#api/services/registration/applicationReadiness';
import type { ApplicationBlocker } from '#lib/helpers/applicationBlockers';
import { PROFILE_FIELDS } from '#lib/schemata/userForm';

const AgeIssueEnum = schemaBuilder.enumType('AgeIssue', {
	description: "How someone's age on the first conference day misses the conference's range.",
	values: {
		tooYoung: { description: 'A participant younger than `participantMinAge`.' },
		tooOld: {
			description:
				'A participant older than `participantMaxAge`, yet younger than `supervisorMinAge`.'
		},
		shouldBeSupervisor: {
			description: 'A participant older than `participantMaxAge`, old enough to be a supervisor.'
		},
		shouldNotBeSupervisor: { description: 'A supervisor younger than `supervisorMinAge`.' }
	} as const
});

const ProfileFieldEnum = schemaBuilder.enumType('ProfileField', {
	description: 'A field of the account form (`userFormSchema`), named as the form names it.',
	values: PROFILE_FIELDS
});

export const ApplicationBlockerRef = schemaBuilder
	.objectRef<ApplicationBlocker & { user: PlausibilityUser | null }>('ApplicationBlocker')
	.implement({
		description:
			'A person of an application the plausibility checks find something about, which keeps the application from being sent. Says what is wrong, never the values.',
		fields: (t) => ({
			userId: t.exposeID('userId'),
			user: t.field({
				type: UserRef,
				nullable: true,
				description: 'The person as far as the caller may read them; null when not at all.',
				resolve: (parent) => parent.user
			}),
			ageIssue: t.field({
				type: AgeIssueEnum,
				nullable: true,
				description:
					"Their age on the first conference day misses the range for their role: a participant's issue for delegates and single participants, `shouldNotBeSupervisor` for supervisors.",
				resolve: (parent) => parent.ageIssue
			}),
			invalidFields: t.field({
				type: [ProfileFieldEnum],
				description: 'The profile fields the account form refuses, in its order.',
				resolve: (parent) => parent.invalidFields
			})
		})
	});

/**
 * Resolves an `applicationBlockers` field (`ApplicationBlockerRef`): what keeps an application
 * not sent yet from being sent, with each person as far as the caller may read them. An
 * application that was sent has none to show.
 */
export function resolveApplicationBlockers(
	load: (id: string) => Promise<ApplicationPeople | undefined>
) {
	return async (parent: { id: string }, _args: object, ctx: ApiContext) =>
		blockersAsReadBy({ ctx, application: await load(parent.id) });
}

/** What keeps the application from being sent, each person as far as the caller may read them. */
async function blockersAsReadBy({
	ctx,
	application
}: {
	ctx: ApiContext;
	application: ApplicationPeople | undefined;
}) {
	if (!application || application.applied || application.blockers.length === 0) return [];
	const readable = await db.query.user.findMany(
		(await ctx.abilities.user.filter('read')).merge({
			where: { id: { in: application.blockers.map((blocker) => blocker.userId) } }
		}).query.many
	);
	return application.blockers.map((blocker) => ({
		...blocker,
		user: readable.find((user) => user.id === blocker.userId) ?? null
	}));
}

/** What an `applicationBlockers` field says about itself. */
export const APPLICATION_BLOCKERS_DESCRIPTION =
	"The people of the application the plausibility checks find something about (a profile the account form refuses, an age outside the conference's range for their role). Sending the application is refused while there are any, unless participant care sends it, who may override them; empty once it was sent.";

const AgeRoleEnum = schemaBuilder.enumType('AgeRole', {
	values: { participant: {}, supervisor: {} } as const
});

const AgeNotice = schemaBuilder
	.objectRef<NonNullable<Awaited<ReturnType<typeof ageNoticeFor>>>>('AgeNotice')
	.implement({
		description: "The caller's age does not fit the conference's range, and the limits it missed.",
		fields: (t) => ({
			issue: t.field({ type: AgeIssueEnum, resolve: (parent) => parent.issue }),
			age: t.exposeInt('age', { description: 'Their age on the first conference day.' }),
			participantMinAge: t.exposeInt('participantMinAge', { nullable: true }),
			participantMaxAge: t.exposeInt('participantMaxAge', { nullable: true }),
			supervisorMinAge: t.exposeInt('supervisorMinAge', { nullable: true })
		})
	});

const PlausibilityResult = schemaBuilder
	.objectRef<{
		tooYoungUsers: PlausibilityUser[];
		tooOldUsers: PlausibilityUser[];
		shouldBeSupervisor: PlausibilityUser[];
		shouldNotBeSupervisor: PlausibilityUser[];
		dataMissing: PlausibilityUser[];
	}>('PlausibilityResult')
	.implement({
		fields: (t) => ({
			tooYoungUsers: t.field({ type: [UserRef], resolve: (parent) => parent.tooYoungUsers }),
			tooOldUsers: t.field({ type: [UserRef], resolve: (parent) => parent.tooOldUsers }),
			shouldBeSupervisor: t.field({
				type: [UserRef],
				resolve: (parent) => parent.shouldBeSupervisor
			}),
			shouldNotBeSupervisor: t.field({
				type: [UserRef],
				resolve: (parent) => parent.shouldNotBeSupervisor
			}),
			dataMissing: t.field({ type: [UserRef], resolve: (parent) => parent.dataMissing })
		})
	});

schemaBuilder.queryFields((t) => ({
	conferencePlausibility: t.field({
		description:
			'Flags participants whose age does not fit the role they registered for, plus those whose account data no longer satisfies the registration form. The same findings keep a delegation or single participant from sending their application (`applicationBlockers`); for supervisors they keep them from confirming they attend in person.',
		type: PlausibilityResult,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReadPlausibility({ ctx, conferenceId: args.conferenceId });
			return findPlausibilityIssues({
				conferenceId: args.conferenceId,
				readableUsers: await ctx.abilities.user.filter('read')
			});
		}
	}),

	mySupervisorSignupBlockers: t.field({
		description:
			'What would keep the caller from signing up to the conference as a supervisor attending in person (`createConferenceSupervisor`): their profile and `supervisorMinAge`. Empty when nothing does; signing up as not attending is open either way.',
		type: [ApplicationBlockerRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const userId = ownAgeNoticeUser(ctx);
			if (!userId) return [];
			return blockersAsReadBy({
				ctx,
				application: await prospectiveSupervisorPeople({ conferenceId: args.conferenceId, userId })
			});
		}
	}),

	myAgeNotice: t.field({
		description:
			"Whether the caller's age on the first conference day fits the conference's range for taking part as `role`; null when it does or no birthday is known. Registering is not refused by age, but a participant's application cannot be sent with an age outside the range (`applicationBlockers`).",
		type: AgeNotice,
		nullable: true,
		args: {
			conferenceId: t.arg.id({ required: true }),
			role: t.arg({ type: AgeRoleEnum, required: true })
		},
		resolve: async (_root, args, ctx) => {
			const userId = ownAgeNoticeUser(ctx);
			if (!userId) return null;
			return ageNoticeFor({ userId, conferenceId: args.conferenceId, role: args.role });
		}
	})
}));
