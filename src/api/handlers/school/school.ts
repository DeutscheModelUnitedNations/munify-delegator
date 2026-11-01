import { db } from '#api/db/db';
import { sql } from 'drizzle-orm';
import { object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	assertCanReadConferenceSchools,
	assertCanReadSchoolMetrics,
	assertCanUpdateSchools,
	registerSchoolAbilities
} from './schoolPermissions';
import {
	conferenceSchoolsPage,
	mergeSchools,
	schoolMetrics,
	searchSchoolIds,
	updateSchool
} from './schoolService';
import {
	conferenceSchoolsArgsSchema,
	schoolRenameSchema,
	searchSchoolsArgsSchema
} from './schoolArgs';

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

schemaBuilder.queryFields((t) => ({
	searchSchools: t.drizzleField({
		description:
			'Schools matching what an applicant typed, the likeliest first, for picking one instead of typing it again.',
		type: [SchoolRef],
		args: t.validate(
			{
				search: t.arg.string({ required: true }),
				limit: t.arg.int({ description: 'At most 50; 10 when left out.' })
			},
			searchSchoolsArgsSchema
		),
		resolve: async (query, _root, args, ctx) => {
			const ids = await searchSchoolIds(args);
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
			'The schools of the people in a conference (participants, supervisors, the waiting list), with how many people each sends, a page at a time. Participant care only.',
		type: ConferenceSchoolsPage,
		args: t.validate(
			{
				conferenceId: t.arg.id({ required: true }),
				search: t.arg.string({ description: "Part of a school's name or city." }),
				sortColumn: t.arg.string({
					description: 'A column of the page; the participants when left out.'
				}),
				sortDesc: t.arg.boolean({ description: 'Descending, unless false.' }),
				limit: t.arg.int({ required: true, description: 'At most 500.' }),
				offset: t.arg.int({ required: true })
			},
			conferenceSchoolsArgsSchema
		),
		resolve: async (_root, args, ctx) => {
			await assertCanReadConferenceSchools({ ctx, conferenceId: args.conferenceId });
			return conferenceSchoolsPage(args);
		}
	}),

	schoolMetrics: t.field({
		description:
			'Per conference, how many people from the school registered, applied, got a seat and came: in the conferences where the caller is participant care (every one for a system admin). NOT_FOUND unless the caller may update the school.',
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
			'Changes the given fields of a school (participant care of a conference where someone names it as their own); the others stay as they are, `null` clears all but the name.',
		type: SchoolRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string().validate(schoolRenameSchema),
			street: t.arg.string(),
			apartment: t.arg.string(),
			zip: t.arg.string(),
			city: t.arg.string(),
			region: t.arg.string(),
			country: t.arg.string({ description: 'ISO 3166-1 alpha-3' }),
			website: t.arg.string(),
			contactName: t.arg({ type: 'PersonName' }),
			contactEmail: t.arg({ type: 'EmailAddress' }),
			contactPhone: t.arg({ type: 'PhoneNumber' }),
			notes: t.arg.string()
		},
		resolve: async (query, _root, { id, contactPhone, ...update }, ctx) => {
			await assertCanUpdateSchools({ ctx, ids: [id] });
			await updateSchool({
				id,
				// stored as E.164, like a person's phone
				update: { ...update, contactPhone: contactPhone === null ? null : contactPhone?.number }
			});
			return db.query.school
				.findFirst(
					query((await ctx.abilities.school.filter('read')).merge({ where: { id } }).query.single)
				)
				.then(assertFindFirstExists);
		}
	}),

	mergeSchools: t.drizzleField({
		description:
			'Folds duplicates into one school: everything naming one of `sourceIds` names `targetId` afterwards, across every conference, and the sources are deleted. NOT_FOUND unless the caller may update every one of them.',
		type: SchoolRef,
		args: {
			targetId: t.arg.id({ required: true }),
			sourceIds: t.arg.idList({ required: true }),
			name: t.arg
				.string({ description: "A new name for the merged school; left out keeps the target's." })
				.validate(schoolRenameSchema)
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
