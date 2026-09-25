import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	userId
} from '$api/services/authHelper';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';
import { waitingListFormSchema } from '../../routes/(authenticated)/registration/[conferenceId]/waiting-list/form-schema';

// Ported from abilities/entities/waitingListEntry.ts
abilityBuilder.waitingListEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

// Users see their own entry.
abilityBuilder.waitingListEntry.allow('read').when((ctx) => {
	const where = isOwnUser(ctx);
	return where ? { where } : undefined;
});

// Participant care and project management manage their conference's waiting list.
abilityBuilder.waitingListEntry.allow(['read', 'update', 'delete']).when((ctx) => {
	const where = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
	return where ? { where } : undefined;
});

export const WaitingListEntryRef = object({ table: 'waitingListEntry' });
query({ table: 'waitingListEntry' });

schemaBuilder.mutationFields((t) => ({
	createWaitingListEntry: t.drizzleField({
		type: WaitingListEntryRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			school: t.arg.string({ required: true }),
			motivation: t.arg.string({ required: true }),
			experience: t.arg.string({ required: true }),
			requests: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const id = userId(ctx);
			if (!id) {
				throw new GraphQLError('Must be logged in');
			}

			// Same zod schema the registration form uses, so the length limits stay in one place.
			waitingListFormSchema.parse({
				school: args.school,
				motivation: args.motivation,
				experience: args.experience,
				requests: args.requests
			});

			const existing = await db.query.waitingListEntry.findFirst({
				where: { conferenceId: args.conferenceId, userId: id }
			});
			if (existing) {
				throw new GraphQLError('You are already on the waiting list for this conference');
			}

			const created = await db
				.insert(schema.waitingListEntry)
				.values({
					conferenceId: args.conferenceId,
					userId: id,
					school: args.school,
					motivation: args.motivation,
					experience: args.experience,
					requests: args.requests ?? undefined
				})
				.returning()
				.then(assertFirstEntryExists);

			return db.query.waitingListEntry
				.findFirst(
					query(
						ctx.abilities.waitingListEntry.filter('read').merge({ where: { id: created.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateWaitingListEntry: t.drizzleField({
		type: WaitingListEntryRef,
		args: {
			id: t.arg.id({ required: true }),
			school: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string(),
			requests: t.arg.string(),
			hidden: t.arg.boolean(),
			assigned: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.waitingListEntry)
				.set({
					school: args.school ?? undefined,
					motivation: args.motivation ?? undefined,
					experience: args.experience ?? undefined,
					requests: args.requests ?? undefined,
					hidden: args.hidden ?? undefined,
					assigned: args.assigned ?? undefined
				})
				.where(
					ctx.abilities.waitingListEntry.filter('update').merge({ where: { id: args.id } }).sql
						.where
				);

			return db.query.waitingListEntry
				.findFirst(
					query(
						ctx.abilities.waitingListEntry.filter('read').merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteWaitingListEntry: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.waitingListEntry)
				.where(
					ctx.abilities.waitingListEntry.filter('delete').merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.waitingListEntry.id });
			if (deleted.length === 0) {
				throw new GraphQLError('Waiting list entry not found, or not yours to delete');
			}
			return true;
		}
	})
}));
