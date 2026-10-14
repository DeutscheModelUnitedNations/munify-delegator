import { db, schema } from '$api/db/db';
import { abilityBuilder, object, countQuery, query, schemaBuilder } from '$api/rumble';
import {
	DELEGATION_ASSIGNMENT,
	isTeamMemberOfConference,
	maskedUntilRelease,
	onceReleased,
	PARTICIPANT_CARE_ROLES,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import {
	createDelegationWithHead,
	previewDelegationByEntryCode,
	updateDelegationDetails
} from './delegationService';
import { assertFindFirstExists } from '@m1212e/rumble';
import type { Context } from '$api/context';
import { delegationMemberPubsub, delegationPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

// Ported from abilities/entities/delegation.ts
abilityBuilder.delegation.allow(['read', 'update', 'delete']).when(systemAdmin);

/** The delegation the caller is a member of. */
function ownDelegation(ctx: Context) {
	const id = userId(ctx);
	return id ? { members: { user: { id } } } : undefined;
}

/** The delegations the caller supervises. */
function supervisedDelegation(ctx: Context) {
	const id = userId(ctx);
	return id ? { members: { supervisors: { user: { id } } } } : undefined;
}

// Delegates see their own delegation, and supervisors the ones they supervise - the assigned
// nation or non-state actor only once the team has released the assignment.
abilityBuilder.delegation
	.allow('read')
	.when((ctx) => maskedUntilRelease(ownDelegation(ctx), DELEGATION_ASSIGNMENT));
abilityBuilder.delegation.allow('read').when((ctx) => onceReleased(ownDelegation(ctx)));
abilityBuilder.delegation
	.allow('read')
	.when((ctx) => maskedUntilRelease(supervisedDelegation(ctx), DELEGATION_ASSIGNMENT));
abilityBuilder.delegation.allow('read').when((ctx) => onceReleased(supervisedDelegation(ctx)));

// The head delegate may change the delegation until it has applied.
abilityBuilder.delegation.allow(['update', 'delete']).when((ctx) => {
	const id = userId(ctx);
	return id
		? { where: { applied: false, members: { user: { id }, isHeadDelegate: true } } }
		: undefined;
});

// Project management and participant care manage their conference's delegations.
abilityBuilder.delegation
	.allow(['read', 'update'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

// Any team member of the conference may see them - without the join code, which the members,
// their supervisors and participant care hand out.
abilityBuilder.delegation.allow('read').when((ctx) => {
	const team = isTeamMemberOfConference(ctx);
	return team ? { where: team, columns: { entryCode: false } } : undefined;
});

const DelegationRef = object({ table: 'delegation' });
query({ table: 'delegation' });
countQuery({ table: 'delegation' });
schemaBuilder.mutationFields((t) => ({
	createDelegation: t.drizzleField({
		type: DelegationRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			school: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const id = userId(ctx);
			if (!id) {
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}

			const createdId = await createDelegationWithHead(id, args);

			delegationPubsub.created();
			delegationMemberPubsub.created();

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
		type: DelegationRef,
		args: {
			id: t.arg.id({ required: true }),
			applied: t.arg.boolean(),
			resetEntryCode: t.arg.boolean(),
			newHeadDelegateUserId: t.arg.id(),
			school: t.arg.string(),
			experience: t.arg.string(),
			motivation: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await updateDelegationDetails(ctx, args);

			delegationPubsub.updated(args.id);
			// A new head delegate flips the flag on two members.
			if (args.newHeadDelegateUserId) {
				delegationMemberPubsub.updated();
			}

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
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.delegation)
				.where(
					(await ctx.abilities.delegation.filter('delete')).merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.delegation.id });
			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
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
		motivation: t.string({ nullable: true }),
		school: t.string({ nullable: true }),
		experience: t.string({ nullable: true }),
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
			ctx.mustBeLoggedIn();

			return previewDelegationByEntryCode(args.conferenceId, args.entryCode);
		}
	})
}));
