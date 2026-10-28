import { db } from '#api/db/db.js';
import { sql } from 'drizzle-orm';
import { object, query, schemaBuilder } from '#api/rumble.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages.js';
import { apiError } from '#api/services/errors/apiError.js';
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
	updateSchool,
	type ConferenceSchoolSortColumn
} from './schoolService';
import {
	conferenceParticipantPubsub,
	conferenceSupervisorPubsub,
	delegationPubsub,
	schoolPubsub,
	schoolSuggestionPubsub,
	schoolSuggestionVariantPubsub,
	singleParticipantPubsub,
	waitingListEntryPubsub
} from '#api/pubsub.js';
import { readableById } from '#api/services/authHelper.js';

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
		/** Delegation members and single participants */
		participants: t.int(),
		applied: t.int(),
		/** Participants holding a role */
		seated: t.int(),
		attended: t.int(),
		supervisors: t.int(),
		waitingList: t.int(),
		/** Waiting list entries that were given a seat */
		fromWaitingList: t.int()
	})
});

const ConferenceSchoolRow = schemaBuilder.simpleObject('ConferenceSchoolRow', {
	fields: (t) => ({
		schoolId: t.id(),
		name: t.string(),
		city: t.string({ nullable: true }),
		delegations: t.int(),
		/** Delegation members and single participants */
		participants: t.int(),
		applied: t.int(),
		/** Participants holding a role */
		seated: t.int(),
		supervisors: t.int(),
		/** Entries still waiting */
		waitingList: t.int()
	})
});

const ConferenceSchoolsPage = schemaBuilder.simpleObject('ConferenceSchoolsPage', {
	fields: (t) => ({
		rows: t.field({ type: [ConferenceSchoolRow] }),
		hasMore: t.boolean(),
		total: t.int()
	})
});

function isSortColumn(column: string): column is ConferenceSchoolSortColumn {
	return CONFERENCE_SCHOOL_SORT_COLUMNS.some((known) => known === column);
}

schemaBuilder.queryFields((t) => ({
	/**
	 * Schools matching what an applicant typed, the likeliest first, for picking one instead of
	 * typing it again.
	 */
	searchSchools: t.drizzleField({
		type: [SchoolRef],
		args: {
			search: t.arg.string({ required: true }),
			limit: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			const ids = await searchSchoolIds(args.search, Math.min(Math.max(args.limit ?? 10, 1), 50));
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

	/** The schools named in a conference, with how many people each sends. Participant care only. */
	conferenceSchools: t.field({
		type: ConferenceSchoolsPage,
		args: {
			conferenceId: t.arg.id({ required: true }),
			search: t.arg.string(),
			sortColumn: t.arg.string(),
			sortDesc: t.arg.boolean(),
			limit: t.arg.int({ required: true }),
			offset: t.arg.int({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReadConferenceSchools(ctx, args.conferenceId);
			const sortColumn = args.sortColumn ?? 'participants';
			if (!isSortColumn(sortColumn)) throw apiError('INVALID_INPUT', m.invalidSortColumn());
			return conferenceSchoolsPage({
				conferenceId: args.conferenceId,
				search: args.search,
				sortColumn,
				sortDesc: args.sortDesc ?? true,
				limit: Math.min(Math.max(args.limit, 1), 500),
				offset: Math.max(args.offset, 0)
			});
		}
	}),

	/** Per conference, how many people from the school registered, applied, got a seat and came. */
	schoolMetrics: t.field({
		type: [SchoolMetrics],
		args: { schoolId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const conferenceIds = await assertCanReadSchoolMetrics(ctx, args.schoolId);
			return schoolMetrics(args.schoolId, conferenceIds);
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	updateSchool: t.drizzleField({
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
			await assertCanUpdateSchools(ctx, [id]);
			await updateSchool(id, update);
			schoolPubsub.updated(id);
			return db.query.school
				.findFirst(query(await readableById(ctx.abilities.school, id)))
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Folds duplicates into one school: everything naming one of `sourceIds` names `targetId`
	 * afterwards, across every conference, and the sources are deleted.
	 */
	mergeSchools: t.drizzleField({
		type: SchoolRef,
		args: {
			targetId: t.arg.id({ required: true }),
			sourceIds: t.arg.idList({ required: true }),
			/** A new name for the merged school */
			name: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateSchools(ctx, [args.targetId, ...args.sourceIds]);
			await mergeSchools(args.targetId, args.sourceIds, args.name ?? undefined);

			schoolPubsub.updated();
			delegationPubsub.updated();
			singleParticipantPubsub.updated();
			conferenceSupervisorPubsub.updated();
			waitingListEntryPubsub.updated();
			conferenceParticipantPubsub.updated();
			schoolSuggestionPubsub.updated();
			schoolSuggestionVariantPubsub.updated();

			return db.query.school
				.findFirst(query(await readableById(ctx.abilities.school, args.targetId)))
				.then(assertFindFirstExists);
		}
	})
}));
