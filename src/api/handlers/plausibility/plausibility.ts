import { schemaBuilder } from '#api/rumble';
import { UserRef } from '#api/handlers/user/user';
import { findPlausibilityIssues, type PlausibilityUser } from './plausibilityService';
import { assertCanReadPlausibility } from './plausibilityPermissions';

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
	})
}));
