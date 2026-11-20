import { db } from '#api/db/db';
import { object, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { conferenceSeriesPubsub } from '#api/pubsub';
import {
	assertCanManageConferenceSeries,
	registerConferenceSeriesAbilities
} from './conferenceSeriesPermissions';
import {
	createConferenceSeries,
	deleteConferenceSeries,
	seriesNameSchema,
	updateConferenceSeries
} from './conferenceSeriesService';

registerConferenceSeriesAbilities();

const ConferenceSeriesRef = object({ table: 'conferenceSeries' });

async function readableSeries({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.conferenceSeries.filter('read')).merge({ where: { id } }).query
		.single;
}

type Subscriptions = Parameters<typeof conferenceSeriesPubsub.registerOnInstance>[0]['instance'];

function listenToSeries(instance: Subscriptions) {
	for (const action of ['created', 'removed', 'updated'] as const) {
		conferenceSeriesPubsub.registerOnInstance({ instance, action });
	}
}

schemaBuilder.queryFields((t) => ({
	conferenceSeriesList: t.drizzleField({
		description:
			'The conference series (MUN-SH, MUNBW) by name: guide pages shared beyond one conference reach the conferences of a series.',
		type: [ConferenceSeriesRef],
		smartSubscription: true,
		subscribe: listenToSeries,
		resolve: async (query, _root, _args, ctx) =>
			db.query.conferenceSeries.findMany(
				query({
					...(await ctx.abilities.conferenceSeries.filter('read')).query.many,
					orderBy: { name: 'asc' }
				})
			)
	})
}));

schemaBuilder.mutationFields((t) => ({
	createConferenceSeries: t.drizzleField({
		description: 'Adds a conference series. System admins only (FORBIDDEN otherwise).',
		type: ConferenceSeriesRef,
		args: {
			name: t.arg.string({ required: true }).validate(seriesNameSchema),
			abbreviation: t.arg.string({ required: true }).validate(seriesNameSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			assertCanManageConferenceSeries(ctx);
			const id = await createConferenceSeries(args);
			return db.query.conferenceSeries
				.findFirst(query(await readableSeries({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateConferenceSeries: t.drizzleField({
		description:
			'Renames a conference series; left out keeps a field. System admins only (FORBIDDEN otherwise).',
		type: ConferenceSeriesRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string().validate(seriesNameSchema.nullish()),
			abbreviation: t.arg.string().validate(seriesNameSchema.nullish())
		},
		resolve: async (query, _root, args, ctx) => {
			assertCanManageConferenceSeries(ctx);
			await updateConferenceSeries(args);
			return db.query.conferenceSeries
				.findFirst(query(await readableSeries({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteConferenceSeries: t.field({
		description:
			'Deletes a conference series no conference and no guide page belongs to (CONFLICT otherwise). System admins only (FORBIDDEN otherwise).',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			assertCanManageConferenceSeries(ctx);
			await deleteConferenceSeries(args.id);
			return true;
		}
	})
}));
