import { schemaBuilder } from '#api/rumble';
import { UserRef } from '#api/handlers/user/user';
import { ageNoticeFor, findPlausibilityIssues, type PlausibilityUser } from './plausibilityService';
import { assertCanReadPlausibility, ownAgeNoticeUser } from './plausibilityPermissions';

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
			'Flags participants whose age does not fit the role they registered for, plus those whose account data no longer satisfies the registration form. Purely advisory - nothing here blocks a registration, it only gives the organizers a list to look at.',
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

	myAgeNotice: t.field({
		description:
			"Whether the caller's age on the first conference day fits the conference's range for taking part as `role`; null when it does or no birthday is known. Only a warning: nothing refuses a registration by age.",
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
