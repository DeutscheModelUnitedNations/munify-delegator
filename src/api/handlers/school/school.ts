import { db } from '#api/db/db';
import { sql } from 'drizzle-orm';
import { object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { z } from 'zod';
import {
	assertCanReadConferenceSchools,
	assertCanReadSchoolMetrics,
	assertCanUpdateSchools,
	registerSchoolAbilities
} from './schoolPermissions';
import {
	CONFERENCE_SCHOOL_SORT_COLUMNS,
	conferenceSchoolsPage,
	mergeSchools,
	schoolMetrics,
	searchSchoolIds,
	updateSchool
} from './schoolService';

registerSchoolAbilities();

const SchoolRef = object({ table: 'school' });
query({ table: 'school' });

const SchoolMetrics = schemaBuilder.simpleObject('SchoolConferenceMetrics', {
	description: 'How many people from one school took part in one conference, step by step.',
	fields: (t) => ({
		conferenceId: t.id(),
		conferenceTitle: t.string(),
		startConference: t.field({ type: 'DateTime' }),
		delegations: t.int(),
		participants: t.int({ description: 'Delegation members and single participants' }),
		applied: t.int(),
		seated: t.int({ description: 'Participants holding a role' }),
		attended: t.int(),
		supervisors: t.int(),
		waitingList: t.int(),
		fromWaitingList: t.int({ description: 'Waiting list entries that were given a seat' })
	})
});

const ConferenceSchoolRow = schemaBuilder.simpleObject('ConferenceSchoolRow', {
	fields: (t) => ({
		schoolId: t.id(),
		name: t.string(),
		city: t.string({ nullable: true }),
		delegations: t.int(),
		participants: t.int({ description: 'Delegation members and single participants' }),
		applied: t.int(),
		seated: t.int({ description: 'Participants holding a role' }),
		supervisors: t.int(),
		waitingList: t.int({ description: 'Entries still waiting' })
	})
});

const ConferenceSchoolsPage = schemaBuilder.simpleObject('ConferenceSchoolsPage', {
	fields: (t) => ({
		rows: t.field({ type: [ConferenceSchoolRow] }),
		hasMore: t.boolean(),
		total: t.int()
	})
});

/** The column the schools page sorts by, the participants when left out. */
const sortColumnSchema = z
	.enum(CONFERENCE_SCHOOL_SORT_COLUMNS, { error: () => m.invalidSortColumn() })
	.nullish()
	.transform((column) => column ?? 'participants');

schemaBuilder.queryFields((t) => ({
	searchSchools: t.drizzleField({
		description:
			'Schools matching what an applicant typed, the likeliest first, for picking one instead of typing it again.',
		type: [SchoolRef],
		args: {
			search: t.arg.string({ required: true }),
			limit: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			const ids = await searchSchoolIds({
				search: args.search,
				limit: Math.min(Math.max(args.limit ?? 10, 1), 50)
			});
			if (ids.length === 0) return [];
			return db.query.school.findMany(
				query({
					...(await ctx.abilities.school.filter('read')).merge({ where: { id: { in: ids } } }).query
						.many,
					// the search's ranking
					orderBy: (school) =>
						sql`array_position(array[${sql.join(
							ids.map((id) => sql`${id}`),
							sql`, `
						)}]::text[], ${school.id})`
				})
			);
		}
	}),

	conferenceSchools: t.field({
		description:
			'The schools named in a conference, with how many people each sends. Participant care only.',
		type: ConferenceSchoolsPage,
		args: {
			conferenceId: t.arg.id({ required: true }),
			search: t.arg.string(),
			sortColumn: t.arg.string().validate(sortColumnSchema),
			sortDesc: t.arg.boolean(),
			limit: t.arg.int({ required: true }),
			offset: t.arg.int({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReadConferenceSchools({ ctx, conferenceId: args.conferenceId });
			return conferenceSchoolsPage({
				conferenceId: args.conferenceId,
				search: args.search,
				sortColumn: args.sortColumn,
				sortDesc: args.sortDesc ?? true,
				limit: Math.min(Math.max(args.limit, 1), 500),
				offset: Math.max(args.offset, 0)
			});
		}
	}),

	schoolMetrics: t.field({
		description:
			'Per conference, how many people from the school registered, applied, got a seat and came.',
		type: [SchoolMetrics],
		args: { schoolId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const { conferenceIds } = await assertCanReadSchoolMetrics({ ctx, schoolId: args.schoolId });
			return schoolMetrics({ schoolId: args.schoolId, conferenceIds });
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	updateSchool: t.drizzleField({
		description:
			'Changes the given fields of a school; the others stay as they are, `null` clears all but the name.',
		type: SchoolRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			street: t.arg.string(),
			apartment: t.arg.string(),
			zip: t.arg.string(),
			city: t.arg.string(),
			region: t.arg.string(),
			/** ISO 3166-1 alpha-3 */
			country: t.arg.string(),
			website: t.arg.string(),
			contactName: t.arg.string(),
			contactEmail: t.arg.string(),
			contactPhone: t.arg.string(),
			notes: t.arg.string()
		},
		resolve: async (query, _root, { id, ...update }, ctx) => {
			await assertCanUpdateSchools({ ctx, ids: [id] });
			await updateSchool({ id, update });
			return db.query.school
				.findFirst(
					query((await ctx.abilities.school.filter('read')).merge({ where: { id } }).query.single)
				)
				.then(assertFindFirstExists);
		}
	}),

	mergeSchools: t.drizzleField({
		description:
			'Folds duplicates into one school: everything naming one of `sourceIds` names `targetId` afterwards, across every conference, and the sources are deleted.',
		type: SchoolRef,
		args: {
			targetId: t.arg.id({ required: true }),
			sourceIds: t.arg.idList({ required: true }),
			/** A new name for the merged school */
			name: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateSchools({ ctx, ids: [args.targetId, ...args.sourceIds] });
			await mergeSchools({
				targetId: args.targetId,
				sourceIds: args.sourceIds,
				name: args.name ?? undefined
			});

			return db.query.school
				.findFirst(
					query(
						(await ctx.abilities.school.filter('read')).merge({ where: { id: args.targetId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
