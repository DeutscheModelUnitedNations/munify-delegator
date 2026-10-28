import { db, schema } from '#api/db/db.js';
import { object, countQuery, query, schemaBuilder } from '#api/rumble.js';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { sql } from 'drizzle-orm';
import { resolveSchoolChoice } from '#api/handlers/school/schoolService.js';
import { waitingListFormSchema } from '../../../routes/(authenticated)/registration/[conferenceId]/waiting-list/form-schema';
import { nullToUndefined } from '#api/services/args.js';
import {
	assertCanSetWaitingListFlags,
	registerWaitingListEntryAbilities
} from './waitingListEntryPermissions';
import { schoolPubsub, waitingListEntryPubsub } from '#api/pubsub.js';
import { assertWaitingListOpenFor } from './waitingListEntryService';
import { m } from '#lib/paraglide/messages.js';
import {
	assertAllowedRow,
	deleteAllowedRow,
	allowedRowWhere,
	assertUpdated,
	readableById
} from '#api/services/authHelper.js';

registerWaitingListEntryAbilities();

const WaitingListEntryRef = object({ table: 'waitingListEntry' });
query({ table: 'waitingListEntry' });
countQuery({ table: 'waitingListEntry' });

schemaBuilder.mutationFields((t) => ({
	createWaitingListEntry: t.drizzleField({
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
		resolve: async (query, _root, args, ctx) => {
			const id = ctx.mustBeLoggedIn().sub;

			// Same zod schema the registration form uses, so the length limits stay in one place.
			waitingListFormSchema.parse({
				schoolId: args.schoolId,
				schoolName: args.schoolName,
				motivation: args.motivation,
				experience: args.experience,
				requests: args.requests
			});

			await assertWaitingListOpenFor(args.conferenceId, id);

			const created = await db
				.insert(schema.waitingListEntry)
				.values({
					conferenceId: args.conferenceId,
					userId: id,
					schoolId: (await resolveSchoolChoice(args)) ?? undefined,
					motivation: args.motivation,
					experience: args.experience,
					requests: nullToUndefined(args.requests)
				})
				.returning()
				.then(assertFirstEntryExists);

			waitingListEntryPubsub.created();
			if (args.schoolName) schoolPubsub.created();

			return db.query.waitingListEntry
				.findFirst(query(await readableById(ctx.abilities.waitingListEntry, created.id)))
				.then(assertFindFirstExists);
		}
	}),

	updateWaitingListEntry: t.drizzleField({
		type: WaitingListEntryRef,
		args: {
			id: t.arg.id({ required: true }),
			/** Both null removes the school; both left out keeps it. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string(),
			requests: t.arg.string(),
			hidden: t.arg.boolean(),
			/** Setting it records when the entrant was given a seat; clearing it forgets the date. */
			assigned: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanSetWaitingListFlags(ctx, args.id, args);
			const where = await allowedRowWhere(ctx, 'waitingListEntry', 'update', args.id);
			// before resolving the school: a typed name creates one
			await assertAllowedRow(schema.waitingListEntry, where, m.updateNotFoundOrForbidden);
			const schoolId = await resolveSchoolChoice(args);
			const assignedAt =
				args.assigned === true
					? sql`coalesce(${schema.waitingListEntry.assignedAt}, now())`
					: args.assigned === false
						? null
						: undefined;
			const updated = await db
				.update(schema.waitingListEntry)
				.set({
					schoolId,
					motivation: nullToUndefined(args.motivation),
					experience: nullToUndefined(args.experience),
					requests: nullToUndefined(args.requests),
					hidden: nullToUndefined(args.hidden),
					assignedAt
				})
				.where(where)
				.returning({ id: schema.waitingListEntry.id });
			assertUpdated(updated);

			waitingListEntryPubsub.updated(args.id);
			if (args.schoolName) schoolPubsub.created();

			return db.query.waitingListEntry
				.findFirst(query(await readableById(ctx.abilities.waitingListEntry, args.id)))
				.then(assertFindFirstExists);
		}
	}),

	deleteWaitingListEntry: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteAllowedRow(ctx, 'waitingListEntry', args.id);
			waitingListEntryPubsub.removed();

			return true;
		}
	})
}));
