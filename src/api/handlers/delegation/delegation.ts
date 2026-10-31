import { applicationFormSchema } from '#lib/schemata/applicationForm';
import { db } from '#api/db/db';
import { object, countQuery, query, schemaBuilder } from '#api/rumble';
import { applicationArgs } from './applicationArgs';
import {
	createDelegationWithHead,
	previewDelegationByEntryCode,
	updateDelegationDetails
} from './delegationService';
import { assertCanUpdateDelegation, registerDelegationAbilities } from './delegationPermissions';
import { codeGuessLimiter } from '#api/services/codeGuessLimit';
import { assertFindFirstExists } from '@m1212e/rumble';
import { delegationMemberPubsub, delegationPubsub } from '#api/pubsub';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerDelegationAbilities();

const DelegationRef = object({ table: 'delegation' });
query({ table: 'delegation' });
countQuery({ table: 'delegation' });
schemaBuilder.mutationFields((t) => ({
	createDelegation: t.drizzleField({
		description:
			'Creates a delegation with the caller as its head delegate, who names their own school.',
		type: DelegationRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			...applicationArgs(t.arg)
		},
		resolve: async (query, _root, args, ctx) => {
			const createdId = await createDelegationWithHead({ userId: ctx.mustBeLoggedIn().sub, args });

			return db.query.delegation
				.findFirst(
					query(
						(await ctx.abilities.delegation.filter('read')).merge({ where: { id: createdId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateDelegation: t.drizzleField({
		description:
			'Changes a delegation in one go: applying (or withdrawing the application), a new entry code, handing on the head delegate, and the application texts. Anything refused leaves the delegation as it was.',
		type: DelegationRef,
		args: {
			id: t.arg.id({ required: true }),
			applied: t.arg.boolean(),
			resetEntryCode: t.arg.boolean(),
			newHeadDelegateUserId: t.arg.id(),
			experience: t.arg.string().validate(applicationFormSchema.shape.experience),
			motivation: t.arg.string().validate(applicationFormSchema.shape.motivation)
		},
		resolve: async (query, _root, args, ctx) => {
			const delegation = await assertCanUpdateDelegation({ ctx, id: args.id });
			await updateDelegationDetails({ delegation, args });

			return db.query.delegation
				.findFirst(
					query(
						(await ctx.abilities.delegation.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteDelegation: t.field({
		description: 'Deletes a delegation together with its members, role applications and papers.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'delegation', id: args.id });
			delegationPubsub.removed();
			delegationMemberPubsub.removed();

			return true;
		}
	})
}));

const DelegationPreview = schemaBuilder.simpleObject('DelegationPreview', {
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
		applied: t.boolean(),
		conferenceTitle: t.string()
	})
});

schemaBuilder.queryFields((t) => ({
	previewDelegation: t.field({
		description:
			"What somebody sees after entering a delegation's join code, before committing to join. Deliberately not ability-filtered: the caller is by definition not a member yet. Knowing the entry code is the authorisation, which is why it only needs a logged-in user.",
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
