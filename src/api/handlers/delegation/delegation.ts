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
import {
	conferenceParticipantPubsub,
	delegationMemberPubsub,
	delegationPubsub,
	schoolPubsub
} from '#api/pubsub';
import { deleteIfAllowed, queryAllowed } from '#api/services/authHelper/utils';

registerDelegationAbilities();

const DelegationRef = object({ table: 'delegation' });
query({ table: 'delegation' });
countQuery({ table: 'delegation' });
schemaBuilder.mutationFields((t) => ({
	createDelegation: t.drizzleField({
		type: DelegationRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			...applicationArgs(t.arg)
		},
		resolve: async (query, _root, args, ctx) => {
			const createdId = await createDelegationWithHead(ctx.mustBeLoggedIn().sub, args);

			delegationPubsub.created();
			delegationMemberPubsub.created();
			conferenceParticipantPubsub.updated();
			if (args.schoolName) schoolPubsub.created();

			return db.query.delegation
				.findFirst(query(await queryAllowed(ctx.abilities.delegation, createdId)))
				.then(assertFindFirstExists);
		}
	}),

	updateDelegation: t.drizzleField({
		type: DelegationRef,
		args: {
			id: t.arg.id({ required: true }),
			applied: t.arg.boolean(),
			resetEntryCode: t.arg.boolean(),
			newHeadDelegateUserId: t.arg.id(),
			experience: t.arg.string(),
			motivation: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const delegation = await assertCanUpdateDelegation(ctx, args.id);
			await updateDelegationDetails(delegation, args);

			delegationPubsub.updated(args.id);
			// A new head delegate flips the flag on two members.
			if (args.newHeadDelegateUserId) {
				delegationMemberPubsub.updated();
			}

			return db.query.delegation
				.findFirst(query(await queryAllowed(ctx.abilities.delegation, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	deleteDelegation: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed(ctx, 'delegation', args.id);
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
		/** The head delegate's own school, which the join form offers the newcomer. */
		headDelegateSchoolId: t.string({ nullable: true }),
		headDelegateSchoolName: t.string({ nullable: true }),
		/** The members' own schools, most common first. */
		schools: t.stringList(),
		memberCount: t.int(),
		headDelegateFullName: t.string(),
		applied: t.boolean(),
		conferenceTitle: t.string()
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * What somebody sees after entering a delegation's join code, before committing to join.
	 *
	 * Deliberately not ability-filtered: the caller is by definition not a member yet. Knowing the
	 * entry code is the authorisation, which is why it only needs a logged-in user.
	 */
	previewDelegation: t.field({
		type: DelegationPreview,
		args: {
			conferenceId: t.arg.id({ required: true }),
			entryCode: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const caller = ctx.mustBeLoggedIn().sub;

			return codeGuessLimiter.attempt(caller, () =>
				previewDelegationByEntryCode(args.conferenceId, args.entryCode)
			);
		}
	})
}));
