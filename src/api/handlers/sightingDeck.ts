import { db } from '$api/db/db';
import { schemaBuilder } from '$api/rumble';
import { PARTICIPANT_CARE_ROLES, assertTeamRole } from '$api/services/authHelper';
import {
	applicationIdsSql,
	deckSchema,
	deckSql,
	entriesSql,
	isSightingStatusFilter,
	schoolRowSchema,
	schoolsSql
} from '$api/services/sightingDeckQuery';
import codenmz from '$lib/helpers/codenamize';
import { GraphQLError } from 'graphql';
import { z } from 'zod';

const SightingDeckEntry = schemaBuilder.simpleObject('SightingDeckEntry', {
	description: 'One application under review: what the deck orders, filters and colours it by.',
	fields: (t) => ({
		kind: t.string(),
		id: t.id(),
		school: t.string({ nullable: true }),
		size: t.int(),
		status: t.string()
	})
});

const SightingDeckCounts = schemaBuilder.simpleObject('SightingDeckCounts', {
	fields: (t) => ({
		rated: t.int(),
		flagged: t.int(),
		disqualified: t.int(),
		unrated: t.int()
	})
});

const SightingDeck = schemaBuilder.simpleObject('SightingDeck', {
	description:
		'A window of the sighting deck (after its filters) around the card on top, and what the navigation needs: the position, the totals and the cards to step to.',
	fields: (t) => ({
		total: t.int(),
		counts: t.field({ type: SightingDeckCounts }),
		overallRated: t.int(),
		overallTotal: t.int(),
		index: t.int(),
		start: t.int(),
		entries: t.field({ type: [SightingDeckEntry] }),
		current: t.field({ type: SightingDeckEntry, nullable: true }),
		previous: t.field({ type: SightingDeckEntry, nullable: true }),
		next: t.field({ type: SightingDeckEntry, nullable: true }),
		nextUnreviewed: t.field({ type: SightingDeckEntry, nullable: true })
	})
});

const SightingSchool = schemaBuilder.simpleObject('SightingSchool', {
	fields: (t) => ({
		school: t.string(),
		applications: t.int(),
		people: t.int()
	})
});

const SightingNameMatch = schemaBuilder.simpleObject('SightingNameMatch', {
	fields: (t) => ({ id: t.id() })
});

const MAX_WINDOW = 200;
const MAX_ENTRIES = 100;
const MAX_NAME_MATCHES = 50;

function statusOf(value: string | null | undefined) {
	const status = value ?? 'all';
	if (!isSightingStatusFilter(status)) throw new GraphQLError(`Unknown status ${status}`);
	return status;
}

schemaBuilder.queryFields((t) => ({
	/**
	 * A window of the sighting's deck, filtered and ordered here: with tens of thousands of
	 * applications the browser holds neither the deck nor its reviews, only the window around the
	 * card on top. Not live - the page asks again when a review changes.
	 */
	sightingDeck: t.field({
		type: SightingDeck,
		args: {
			conferenceId: t.arg.id({ required: true }),
			status: t.arg.string(),
			school: t.arg.string(),
			currentId: t.arg.id(),
			index: t.arg.int(),
			size: t.arg.int(),
			// Not used: a different value is a different request, which the client cache answers anew.
			revision: t.arg.int()
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const result = await db.execute<{ result: unknown }>(
				deckSql({
					conferenceId: args.conferenceId,
					status: statusOf(args.status),
					school: args.school ?? null,
					currentId: args.currentId ?? null,
					index: args.index ?? null,
					size: Math.min(Math.max(args.size ?? 60, 1), MAX_WINDOW)
				})
			);
			return deckSchema.parse(result.rows[0]?.result);
		}
	}),

	/** The entries among `ids` that pass the filters - the hits of a search, with their status. */
	sightingEntries: t.field({
		type: [SightingDeckEntry],
		args: {
			conferenceId: t.arg.id({ required: true }),
			ids: t.arg.idList({ required: true }),
			status: t.arg.string(),
			school: t.arg.string()
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const ids = args.ids.slice(0, MAX_ENTRIES);
			if (ids.length === 0) return [];
			const result = await db.execute<{ result: unknown }>(
				entriesSql(args.conferenceId, ids, statusOf(args.status), args.school ?? null)
			);
			return result.rows.map((row) => deckSchema.shape.current.unwrap().parse(row.result));
		}
	}),

	/**
	 * The applications whose codename or id contains every word of the search. Codenames are
	 * worked out from the id and stored nowhere, so they are matched here, not in SQL.
	 */
	sightingNameMatches: t.field({
		type: [SightingNameMatch],
		args: {
			conferenceId: t.arg.id({ required: true }),
			search: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const terms = args.search.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 5);
			if (terms.length === 0) return [];
			const result = await db.execute<{ id: string }>(applicationIdsSql(args.conferenceId));
			const matches: { id: string }[] = [];
			for (const { id } of result.rows) {
				const name = `${codenmz(id)} ${id}`.toLowerCase();
				if (terms.every((term) => name.includes(term))) matches.push({ id });
				if (matches.length >= MAX_NAME_MATCHES) break;
			}
			return matches;
		}
	}),

	/** The schools to pick from in the school filter: a few matching a search, not all thousands. */
	sightingSchools: t.field({
		type: [SightingSchool],
		args: {
			conferenceId: t.arg.id({ required: true }),
			search: t.arg.string(),
			limit: t.arg.int()
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			const search = (args.search ?? '').trim().replace(/[\\%_]/g, '\\$&');
			const result = await db.execute(
				schoolsSql(args.conferenceId, `%${search}%`, Math.min(args.limit ?? 20, 50))
			);
			return z.array(schoolRowSchema).parse(result.rows);
		}
	})
}));
