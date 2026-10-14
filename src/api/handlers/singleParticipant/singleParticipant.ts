import { db, schema } from '$api/db/db';
import { abilityBuilder, object, countQuery, query, schemaBuilder } from '$api/rumble';
import {
	assertTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	maskedUntilRelease,
	onceReleased,
	PARTICIPANT_CARE_ROLES,
	SINGLE_PARTICIPANT_ASSIGNMENT,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import type { Context } from '$api/context';
import {
	createAssignedSingleParticipant,
	registerSingleParticipant,
	updateSingleParticipantApplication
} from './singleParticipantService';
import { assertFindFirstExists } from '@m1212e/rumble';
import { singleParticipantPubsub, waitingListEntryPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

// Ported from abilities/entities/singleParticipant.ts
abilityBuilder.singleParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see their own entry - the role they were given only once the team has released the
// assignment.
abilityBuilder.singleParticipant
	.allow('read')
	.when((ctx) => maskedUntilRelease(isOwnUser(ctx), SINGLE_PARTICIPANT_ASSIGNMENT));
abilityBuilder.singleParticipant.allow('read').when((ctx) => onceReleased(isOwnUser(ctx)));

// Participant care and project management see and manage their conference's participants.
abilityBuilder.singleParticipant
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

// Users may change their own entry only until they have applied.
abilityBuilder.singleParticipant.allow(['update', 'delete']).when((ctx) => {
	const id = userId(ctx);
	return id ? { where: { user: { id }, applied: false } } : undefined;
});

/** The single participants the caller supervises. */
function supervisedParticipant(ctx: Context) {
	const id = userId(ctx);
	return id ? { supervisors: { user: { id } } } : undefined;
}

// Supervisors see the participants they supervise, with their role once it is released.
abilityBuilder.singleParticipant
	.allow('read')
	.when((ctx) => maskedUntilRelease(supervisedParticipant(ctx), SINGLE_PARTICIPANT_ASSIGNMENT));
abilityBuilder.singleParticipant
	.allow('read')
	.when((ctx) => onceReleased(supervisedParticipant(ctx)));

const SingleParticipantRef = object({ table: 'singleParticipant' });
query({ table: 'singleParticipant' });
countQuery({ table: 'singleParticipant' });
schemaBuilder.mutationFields((t) => ({
	/**
	 * Registering as a single participant. If the user already has an entry for this conference
	 * the legacy resolver updated it instead of failing, so this does the same.
	 */
	createSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true }),
			school: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const id = userId(ctx);
			if (!id) {
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}

			const rowId = await registerSingleParticipant(id, args);

			singleParticipantPubsub.created();

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({ where: { id: rowId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			id: t.arg.id({ required: true }),
			school: t.arg.string(),
			experience: t.arg.string(),
			motivation: t.arg.string(),
			applyForRolesIdList: t.arg.idList(),
			unApplyForRolesIdList: t.arg.idList(),
			applied: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await updateSingleParticipantApplication(ctx, args);

			singleParticipantPubsub.updated(args.id);

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteSingleParticipant: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.singleParticipant)
				.where(
					(await ctx.abilities.singleParticipant.filter('delete')).merge({ where: { id: args.id } })
						.sql.where
				)
				.returning({ id: schema.singleParticipant.id });
			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			singleParticipantPubsub.removed();

			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/** Management assigning a user directly as a single participant with a role. */
	createAppliedSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);

			const createdId = await createAssignedSingleParticipant(args);

			singleParticipantPubsub.created();
			waitingListEntryPubsub.updated();

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({
							where: { id: createdId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
