import { applicationFormSchema } from '#lib/schemata/applicationForm';
import { db } from '#api/db/db';
import { object, countQuery, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { applicationArgs } from '#api/services/registration/applicationArgs';
import {
	createDelegationWithHead,
	deleteDelegation,
	previewDelegationByEntryCode,
	updateDelegationDetails
} from './delegationService';
import {
	assertCanDeleteDelegation,
	assertCanUpdateDelegation,
	registerDelegationAbilities
} from './delegationPermissions';
import { codeGuessLimiter } from '#api/services/codeGuessLimit';
import { assertFindFirstExists } from '@m1212e/rumble';
import { refreshCallerAbilities } from '#api/services/authHelper/callerFacts';
import { byParticipantCareOf } from '#api/services/authHelper/rules';
import {
	APPLICATION_BLOCKERS_DESCRIPTION,
	ApplicationBlockerRef,
	resolveApplicationBlockers
} from '#api/handlers/plausibility/plausibility';
import { delegationApplicationPeople } from '#api/services/registration/applicationReadiness';

registerDelegationAbilities();

const DelegationRef = object({
	table: 'delegation',
	adjust: (t) => ({
		applicationBlockers: t.field({
			type: [ApplicationBlockerRef],
			description: APPLICATION_BLOCKERS_DESCRIPTION,
			resolve: resolveApplicationBlockers((delegationId) =>
				delegationApplicationPeople({ delegationId })
			)
		})
	})
});
query({ table: 'delegation' });
countQuery({ table: 'delegation' });

/**
 * The delegation `id` as far as the caller may read it once the mutation has written it
 * (`refreshCallerAbilities`), for a `drizzleField` to answer with.
 */
async function readableDelegation({ ctx, id }: { ctx: ApiContext; id: string }) {
	await refreshCallerAbilities(ctx);
	return (await ctx.abilities.delegation.filter('read')).merge({ where: { id } }).query.single;
}

schemaBuilder.mutationFields((t) => ({
	createDelegation: t.drizzleField({
		description:
			'Creates a delegation with the caller as its head delegate, who names their own school. Refused with CONFLICT outside the registration window or when the caller already takes part in the conference.',
		type: DelegationRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			...applicationArgs(t.arg)
		},
		resolve: async (query, _root, args, ctx) => {
			const createdId = await createDelegationWithHead({ userId: ctx.mustBeLoggedIn().sub, args });

			return db.query.delegation
				.findFirst(query(await readableDelegation({ ctx, id: createdId })))
				.then(assertFindFirstExists);
		}
	}),

	updateDelegation: t.drizzleField({
		description:
			'Changes a delegation in one go; arguments left out stay as they are. Anything refused leaves the delegation as it was. Applying needs enough members, role applications, both texts and members the plausibility checks find nothing about (`applicationBlockers`; CONFLICT otherwise), which participant care may override; applicants withdraw only while the conference takes registrations, participant care at any stage.',
		type: DelegationRef,
		args: {
			id: t.arg.id({ required: true }),
			applied: t.arg.boolean({
				description: 'Sends the application (true) or takes it back (false).'
			}),
			resetEntryCode: t.arg.boolean({
				description: 'Hands out a new entry code; the old one stops working.'
			}),
			newHeadDelegateUserId: t.arg.id({
				description: 'Makes this member the head delegate instead of the current one.'
			}),
			experience: t.arg
				.string({ description: '`null` clears it.' })
				.validate(applicationFormSchema.shape.experience),
			motivation: t.arg
				.string({ description: '`null` clears it.' })
				.validate(applicationFormSchema.shape.motivation)
		},
		resolve: async (query, _root, args, ctx) => {
			const delegation = await assertCanUpdateDelegation({ ctx, id: args.id });
			await updateDelegationDetails({
				delegation,
				args,
				byParticipantCare: await byParticipantCareOf({ ctx, conferenceId: delegation.conferenceId })
			});

			return db.query.delegation
				.findFirst(query(await readableDelegation({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteDelegation: t.field({
		description:
			'Deletes a delegation together with its members, role applications and papers. The head delegate may until the delegation has applied, participant care at any time.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteDelegation(await assertCanDeleteDelegation({ ctx, id: args.id }));
			return true;
		}
	})
}));

const DelegationPreview = schemaBuilder.simpleObject('DelegationPreview', {
	description: 'What the join form shows about a delegation before somebody joins it.',
	fields: (t) => ({
		id: t.string(),
		conferenceId: t.string(),
		entryCode: t.string(),
		headDelegateSchoolId: t.string({
			description: "The head delegate's own school, which the join form offers the newcomer.",
			nullable: true
		}),
		headDelegateSchoolName: t.string({ nullable: true }),
		schools: t.stringList({ description: "The members' own schools, most common first." }),
		memberCount: t.int(),
		headDelegateFullName: t.string(),
		applied: t.boolean({ description: 'An applied delegation takes nobody new.' }),
		conferenceTitle: t.string()
	})
});

schemaBuilder.queryFields((t) => ({
	previewDelegation: t.field({
		description:
			"What somebody sees after entering a delegation's entry code, before committing to join. Not ability-filtered: the caller is not a member yet, and knowing the code is the authorisation. A wrong code answers NOT_FOUND; ten of those in ten minutes answer TOO_MANY_ATTEMPTS.",
		type: DelegationPreview,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const caller = ctx.mustBeLoggedIn().sub;

			return codeGuessLimiter.attempt({
				key: caller,
				run: () =>
					previewDelegationByEntryCode({
						conferenceId: args.conferenceId,
						entryCode: args.entryCode
					})
			});
		}
	})
}));
