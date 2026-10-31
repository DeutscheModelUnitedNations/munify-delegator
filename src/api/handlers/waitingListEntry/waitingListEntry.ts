import { db, schema } from '#api/db/db';
import { object, countQuery, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { sql } from 'drizzle-orm';
import { resolveSchoolChoice } from '#api/handlers/school/schoolService';
import { waitingListFormSchema } from '../../../routes/(authenticated)/registration/[conferenceId]/waiting-list/form-schema';
import { nullToUndefined } from '#api/services/args';
import {
	assertCanSetWaitingListFlags,
	registerWaitingListEntryAbilities
} from './waitingListEntryPermissions';
import { waitingListEntryPubsub } from '#api/pubsub';
import { assertWaitingListOpenFor } from './waitingListEntryService';
import { assertAllowed, deleteIfAllowed, updateIfAllowed } from '#api/services/authHelper/utils';

registerWaitingListEntryAbilities();

const WaitingListEntryRef = object({ table: 'waitingListEntry' });
query({ table: 'waitingListEntry' });
countQuery({ table: 'waitingListEntry' });

schemaBuilder.mutationFields((t) => ({
	createWaitingListEntry: t.drizzleField({
		description:
			"Puts the caller on the conference's waiting list; refused unless the waiting list is open to them.",
		type: WaitingListEntryRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** An existing school, or `schoolName` to find or create one; neither for no school. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string(),
			motivation: t.arg.string({ required: true }),
			experience: t.arg.string({ required: true }),
			requests: t.arg.string()
		},
		// The registration form's schema, so the limits stay in one place.
		validate: waitingListFormSchema,
		resolve: async (query, _root, args, ctx) => {
			const id = ctx.mustBeLoggedIn().sub;

			await assertWaitingListOpenFor({ conferenceId: args.conferenceId, userId: id });

			const created = await db
				.insert(schema.waitingListEntry)
				.values({
					conferenceId: args.conferenceId,
					userId: id,
					schoolId: (await resolveSchoolChoice({ choice: args })) ?? undefined,
					motivation: args.motivation,
					experience: args.experience,
					requests: nullToUndefined(args.requests)
				})
				.returning()
				.then(assertFirstEntryExists);

			waitingListEntryPubsub.created();

			return db.query.waitingListEntry
				.findFirst(
					query(
						(await ctx.abilities.waitingListEntry.filter('read')).merge({
							where: { id: created.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateWaitingListEntry: t.drizzleField({
		description:
			"Changes the given fields of a waiting list entry; the others stay as they are. Hiding the entry or marking it seated is the team's.",
		type: WaitingListEntryRef,
		args: {
			id: t.arg.id({ required: true }),
			/** Both null removes the school; both left out keeps it. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string().validate(waitingListFormSchema.shape.schoolName),
			motivation: t.arg.string().validate(waitingListFormSchema.shape.motivation.nullish()),
			experience: t.arg.string().validate(waitingListFormSchema.shape.experience.nullish()),
			requests: t.arg.string().validate(waitingListFormSchema.shape.requests),
			hidden: t.arg.boolean(),
			/** Setting it records when the entrant was given a seat; clearing it forgets the date. */
			assigned: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanSetWaitingListFlags({ ctx, id: args.id, args });
			// before resolving the school: a typed name creates one
			await assertAllowed({ ctx, table: 'waitingListEntry', action: 'update', id: args.id });
			const schoolId = await resolveSchoolChoice({ choice: args });
			const assignedAt =
				args.assigned === true
					? sql`coalesce(${schema.waitingListEntry.assignedAt}, now())`
					: args.assigned === false
						? null
						: undefined;
			await updateIfAllowed({
				ctx,
				table: 'waitingListEntry',
				id: args.id,
				values: {
					schoolId,
					motivation: nullToUndefined(args.motivation),
					experience: nullToUndefined(args.experience),
					requests: nullToUndefined(args.requests),
					hidden: nullToUndefined(args.hidden),
					assignedAt
				}
			});

			waitingListEntryPubsub.updated(args.id);

			return db.query.waitingListEntry
				.findFirst(
					query(
						(await ctx.abilities.waitingListEntry.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteWaitingListEntry: t.field({
		description: 'Takes an entry off the waiting list.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'waitingListEntry', id: args.id });
			waitingListEntryPubsub.removed();

			return true;
		}
	})
}));
