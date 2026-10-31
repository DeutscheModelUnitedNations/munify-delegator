import { db } from '#api/db/db';
import { object, countQuery, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { waitingListFormSchema } from '#lib/schemata/waitingListForm';
import {
	assertCanUpdateWaitingListEntry,
	registerWaitingListEntryAbilities
} from './waitingListEntryPermissions';
import { waitingListEntryPubsub } from '#api/pubsub';
import { createWaitingListEntry, updateWaitingListEntry } from './waitingListEntryService';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerWaitingListEntryAbilities();

const WaitingListEntryRef = object({ table: 'waitingListEntry' });
query({ table: 'waitingListEntry' });
countQuery({ table: 'waitingListEntry' });

/** The entry `id` as far as the caller may read it, for a `drizzleField` to answer with. */
async function readableEntry({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.waitingListEntry.filter('read')).merge({ where: { id } }).query
		.single;
}

schemaBuilder.mutationFields((t) => ({
	createWaitingListEntry: t.drizzleField({
		description:
			"Puts the caller on the conference's waiting list. CONFLICT unless the conference is in preparation, the caller is not on it yet, and, having applied, the assignment is released and gave them no role.",
		type: WaitingListEntryRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			schoolId: t.arg.id({
				description: "An existing school as the entrant's own; neither school argument for none."
			}),
			schoolName: t.arg.string({
				description: 'The name of a school to find (ignoring case and spacing) or create.'
			}),
			motivation: t.arg.string({ required: true }),
			experience: t.arg.string({ required: true }),
			requests: t.arg.string()
		},
		// The registration form's schema, so the limits stay in one place.
		validate: waitingListFormSchema,
		resolve: async (query, _root, args, ctx) => {
			const id = await createWaitingListEntry({
				conferenceId: args.conferenceId,
				userId: ctx.mustBeLoggedIn().sub,
				school: { schoolId: args.schoolId, schoolName: args.schoolName },
				texts: {
					motivation: args.motivation,
					experience: args.experience,
					requests: args.requests
				}
			});

			return db.query.waitingListEntry
				.findFirst(query(await readableEntry({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateWaitingListEntry: t.drizzleField({
		description:
			"Changes the given fields of a waiting list entry; the others stay as they are. The entrant may until they are given a seat, participant care at any time; hiding the entry is participant care's alone.",
		type: WaitingListEntryRef,
		args: {
			id: t.arg.id({ required: true }),
			schoolId: t.arg.id({
				description: 'Both school arguments null removes the school; both left out keeps it.'
			}),
			schoolName: t.arg
				.string({
					description: 'The name of a school to find (ignoring case and spacing) or create.'
				})
				.validate(waitingListFormSchema.shape.schoolName),
			motivation: t.arg.string().validate(waitingListFormSchema.shape.motivation.nullish()),
			experience: t.arg.string().validate(waitingListFormSchema.shape.experience.nullish()),
			requests: t.arg.string().validate(waitingListFormSchema.shape.requests),
			hidden: t.arg.boolean({
				description: 'Hides the entry from the waiting list the team works through.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateWaitingListEntry({ ctx, id: args.id, hidden: args.hidden });
			await updateWaitingListEntry({
				id: args.id,
				school: { schoolId: args.schoolId, schoolName: args.schoolName },
				texts: {
					motivation: args.motivation,
					experience: args.experience,
					requests: args.requests
				},
				hidden: args.hidden
			});

			return db.query.waitingListEntry
				.findFirst(query(await readableEntry({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteWaitingListEntry: t.field({
		description:
			'Takes an entry off the waiting list: the entrant until they are given a seat, participant care at any time.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'waitingListEntry', id: args.id });
			waitingListEntryPubsub.removed();

			return true;
		}
	})
}));
