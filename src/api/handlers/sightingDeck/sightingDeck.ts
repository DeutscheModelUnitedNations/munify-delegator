import { schemaBuilder } from '#api/rumble';
import { schoolFilterOf, schoolFilterSchema, sightingStatusSchema } from './sightingDeckQuery';
import { assertCanReadSightingDeck } from './sightingDeckPermissions';
import {
	deckSizeSchema,
	entryIdsSchema,
	findSightingNameMatches,
	loadSightingDeck,
	loadSightingEntries,
	schoolLimitSchema,
	searchSightingSchools
} from './sightingDeckService';

const SightingDeckEntry = schemaBuilder.simpleObject('SightingDeckEntry', {
	description: 'One application under review: what the deck orders, filters and colours it by.',
	fields: (t) => ({
		kind: t.string({ description: '`delegation` or `single` (a single participant).' }),
		id: t.id({ description: "The delegation's or single participant's id." }),
		school: t.string({
			nullable: true,
			description: "Its people's schools as one line, most common first; null when none named one."
		}),
		size: t.int({ description: 'How many people the application is for.' }),
		status: t.string({
			description:
				'How far the sighting has come with it: `unrated`, `flagged` (flagged but not rated), `rated` or `disqualified`.'
		}),
		required: t.boolean({ description: 'Marked as one that has to get a seat.' })
	})
});

const SightingDeckCounts = schemaBuilder.simpleObject('SightingDeckCounts', {
	description: "The deck's applications (after its filters) by status.",
	fields: (t) => ({
		rated: t.int({ description: 'Rated applications.' }),
		flagged: t.int({ description: 'Flagged applications not rated yet.' }),
		disqualified: t.int({ description: 'Disqualified applications.' }),
		unrated: t.int({ description: 'Applications nobody has looked at yet.' })
	})
});

const SightingDeck = schemaBuilder.simpleObject('SightingDeck', {
	description:
		'A window of the sighting deck (after its filters) around the card on top, and what the navigation needs: the position, the totals and where the next unrated card lies past the window.',
	fields: (t) => ({
		total: t.int({ description: 'Applications in the deck after its filters.' }),
		counts: t.field({ type: SightingDeckCounts, description: 'The deck by status.' }),
		overallRated: t.int({
			description:
				'Applications of the whole conference rated or disqualified, whatever the filters.'
		}),
		overallTotal: t.int({ description: 'Applications under review in the whole conference.' }),
		index: t.int({ description: 'The position of the card on top in the deck.' }),
		start: t.int({ description: "The position of the window's first card in the deck." }),
		entries: t.field({
			type: [SightingDeckEntry],
			description: 'The cards of the window, in order.'
		}),
		current: t.field({
			type: SightingDeckEntry,
			nullable: true,
			description: 'The card on top; null for an empty deck.'
		}),
		unreviewedPastWindow: t.field({
			type: SightingDeckEntry,
			nullable: true,
			description:
				'The first unrated card after the window, or else the first unrated card of the deck.'
		})
	})
});

const SightingSchool = schemaBuilder.simpleObject('SightingSchool', {
	description: 'A school of the people in the applications under review.',
	fields: (t) => ({
		schoolId: t.id({ nullable: true, description: 'None for the people without a school.' }),
		school: t.string({ description: "The school's name; empty for the people without one." }),
		city: t.string({ nullable: true, description: "The school's city." }),
		applications: t.int({ description: 'Applications with someone from the school.' }),
		people: t.int({ description: 'People in the applications from the school.' })
	})
});

const SightingNameMatch = schemaBuilder.simpleObject('SightingNameMatch', {
	description: 'An application whose codename or id matched.',
	fields: (t) => ({ id: t.id({ description: "The delegation's or single participant's id." }) })
});

/** The descriptions of the arguments both deck queries filter by. */
const FILTER_ARGS = {
	status:
		'Only applications of this status: `all` (also when left out), `unrated`, `rated`, `flagged`, `disqualified` or `noted` (with a note).',
	schoolId: 'Only applications with someone from this school.',
	withoutSchool:
		'Only applications with someone who named no school; not together with `schoolId` (INVALID_INPUT).'
};

schemaBuilder.queryFields((t) => ({
	sightingDeck: t.field({
		description:
			"A window of the sighting's deck: the conference's applied delegations (largest first), then its single participants, filtered and ordered here. With tens of thousands of applications the browser holds neither the deck nor its reviews, only the window around the card on top. Not live: a review drops the cached answer and the page asks again. Participant care only (FORBIDDEN otherwise).",
		type: SightingDeck,
		args: {
			conferenceId: t.arg.id({ required: true }),
			status: t.arg.string({ description: FILTER_ARGS.status }).validate(sightingStatusSchema),
			schoolId: t.arg.id({ description: FILTER_ARGS.schoolId }),
			withoutSchool: t.arg.boolean({ description: FILTER_ARGS.withoutSchool }),
			currentId: t.arg.id({
				description:
					'The card to put on top. One the filters hide leaves the card that took its place on top.'
			}),
			index: t.arg.int({
				description: 'The position to put on top instead; wins over `currentId`.'
			}),
			size: t.arg
				.int({ description: 'Cards in the window, 1 to 200; 60 when left out.' })
				.validate(deckSizeSchema)
		},
		validate: schoolFilterSchema,
		resolve: async (_root, args, ctx) => {
			await assertCanReadSightingDeck({ ctx, conferenceId: args.conferenceId });
			return loadSightingDeck({
				conferenceId: args.conferenceId,
				status: args.status,
				school: schoolFilterOf(args),
				currentId: args.currentId ?? null,
				index: args.index ?? null,
				size: args.size
			});
		}
	}),

	sightingEntries: t.field({
		description:
			'The entries among `ids` that pass the filters, in deck order: the hits of a search, with their status. Participant care only (FORBIDDEN otherwise).',
		type: [SightingDeckEntry],
		args: {
			conferenceId: t.arg.id({ required: true }),
			ids: t.arg
				.idList({
					required: true,
					description:
						'Delegation and single participant ids, at most 100; those not under review in the conference are left out.'
				})
				.validate(entryIdsSchema),
			status: t.arg.string({ description: FILTER_ARGS.status }).validate(sightingStatusSchema),
			schoolId: t.arg.id({ description: FILTER_ARGS.schoolId }),
			withoutSchool: t.arg.boolean({ description: FILTER_ARGS.withoutSchool })
		},
		validate: schoolFilterSchema,
		resolve: async (_root, args, ctx) => {
			await assertCanReadSightingDeck({ ctx, conferenceId: args.conferenceId });
			return loadSightingEntries({
				conferenceId: args.conferenceId,
				ids: args.ids,
				status: args.status,
				school: schoolFilterOf(args)
			});
		}
	}),

	sightingNameMatches: t.field({
		description:
			"The conference's applications under review whose codename or id contains the search, at most 50. Participant care only (FORBIDDEN otherwise).",
		type: [SightingNameMatch],
		args: {
			conferenceId: t.arg.id({ required: true }),
			search: t.arg.string({
				required: true,
				description: 'Text to look for; blank finds nothing.'
			})
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReadSightingDeck({ ctx, conferenceId: args.conferenceId });
			return findSightingNameMatches(args);
		}
	}),

	sightingSchools: t.field({
		description:
			'The schools to pick from in the school filter: a few matching a search, not all thousands, by name. Participant care only (FORBIDDEN otherwise).',
		type: [SightingSchool],
		args: {
			conferenceId: t.arg.id({ required: true }),
			search: t.arg.string({
				description: "Text the school's name contains; every school when left out."
			}),
			limit: t.arg
				.int({ description: 'Schools to answer, 1 to 50; 20 when left out.' })
				.validate(schoolLimitSchema)
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReadSightingDeck({ ctx, conferenceId: args.conferenceId });
			return searchSightingSchools(args);
		}
	})
}));
