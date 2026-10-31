import { db } from '#api/db/db';
import { schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { assertCanReadStatistics } from './statisticsPermissions';
import type { StatsFilterType } from './statisticsFilters';
import {
	addressesOf,
	ageStatisticsOf,
	committeeFillRatesOf,
	countdownsOf,
	dietOf,
	genderOf,
	nationalityDistributionOf,
	paperStatsOf,
	postalPaymentProgressOf,
	registrationStatisticsOf,
	registrationTimelineOf,
	roleBasedOf,
	schoolStatsOf,
	supervisorStatsOf,
	waitingListOf
} from './statisticsViews';
import { statisticsRefreshedAt, statisticsRowsOf, type StatisticsRows } from './statisticsData';
import { zipCoordinates } from './zipCoordinates';
import {
	committeeFillRate,
	countdownsType,
	registeredType,
	registrationTimelineEntry,
	roleBasedStats
} from './registrationTypes';
import {
	addressesType,
	ageStatsType,
	dietType,
	genderType,
	nationalityStats,
	schoolStats
} from './peopleTypes';
import {
	paperStatsType,
	postalPaymentProgressType,
	supervisorStatsType,
	waitingListStats
} from './progressTypes';

// The statistics are aggregations over every registration of a conference, served from
// materialized views rather than computed per request. The `refresh-statistics` job
// (`src/jobs/refreshStatistics.ts`) keeps them current. The result's types live beside this file,
// one module per part of the dashboard: `registrationTypes.ts`, `peopleTypes.ts` and
// `progressTypes.ts`.

const StatsFilterEnum = schemaBuilder.enumType('StatsFilter', {
	description:
		'Which registrations the statistics count. Blocks about the operational state ignore it; their descriptions say so.',
	values: {
		ALL: { description: 'Every registration.' },
		APPLIED: { description: 'Registrations that have sent their application.' },
		NOT_APPLIED: { description: 'Registrations that have not sent their application yet.' },
		APPLIED_WITH_ROLE: {
			description: 'Applied registrations with a role (a nation, non-state actor or custom role).'
		},
		APPLIED_WITHOUT_ROLE: { description: 'Applied registrations without a role.' }
	} as const
});

/** What every block of the statistics resolves from: its view rows are loaded on first use. */
interface StatisticsSource {
	conference: { startConference: Date; applicationDeadline: Date };
	filter: StatsFilterType;
	rows: StatisticsRows;
}

const StatisticsResult = schemaBuilder.objectRef<StatisticsSource>('StatisticsResult').implement({
	description:
		"A conference's statistics dashboard. Each block reads only the views it needs, so a query selecting few blocks stays cheap.",
	fields: (t) => ({
		refreshedAt: t.field({
			type: 'DateTime',
			nullable: true,
			description:
				'When the figures were last recomputed; they lag the data by up to that long. Null before the first refresh.',
			resolve: () => statisticsRefreshedAt()
		}),
		countdowns: t.field({
			type: countdownsType,
			description: 'Days until the conference and until the application deadline.',
			resolve: ({ conference }) => countdownsOf({ conference })
		}),
		registered: t.field({
			type: registeredType,
			description: 'How many registered and applied, in total and per kind of registration.',
			resolve: async ({ rows, filter }) =>
				registrationStatisticsOf({
					people: await rows.people(),
					delegations: await rows.delegations(),
					roleApplications: await rows.roleApplications(),
					filter
				})
		}),
		age: t.field({
			type: ageStatsType,
			description: 'Ages at the end of the conference, of the registrations the filter selects.',
			resolve: async ({ rows, filter }) => ageStatisticsOf({ ages: await rows.ages(), filter })
		}),
		diet: t.field({
			type: dietType,
			description: 'Food preferences, of the registrations the filter selects and of the team.',
			resolve: async ({ rows, filter }) => dietOf({ people: await rows.people(), filter })
		}),
		gender: t.field({
			type: genderType,
			description: 'Genders, of the registrations the filter selects and of the team.',
			resolve: async ({ rows, filter }) => genderOf({ people: await rows.people(), filter })
		}),
		addresses: t.field({
			type: [addressesType],
			description:
				'Where the delegation members and single participants the filter selects live, by country and ZIP area.',
			resolve: async ({ rows, filter }) => {
				const [addresses, coordinates] = await Promise.all([rows.addresses(), zipCoordinates()]);
				return addressesOf({ addresses, filter }).map((address) => ({
					...address,
					...(address.country === 'DEU' && address.zipPrefix !== null
						? coordinates.get(address.zipPrefix)
						: undefined)
				}));
			}
		}),
		roleBased: t.field({
			type: roleBasedStats,
			description: 'Who got a role, among the registrations the filter selects.',
			resolve: async ({ rows, filter }) =>
				roleBasedOf({ people: await rows.people(), delegations: await rows.delegations(), filter })
		}),
		committeeFillRates: t.field({
			type: [committeeFillRate],
			description: 'Seats and assigned seats per committee, by name. Ignores the filter.',
			resolve: async ({ rows }) => committeeFillRatesOf(await rows.committeeFill())
		}),
		registrationTimeline: t.field({
			type: [registrationTimelineEntry],
			description:
				'Running totals of the registrations the filter selects, one entry per day from the first registration to the last.',
			resolve: async ({ rows, filter }) =>
				registrationTimelineOf({ days: await rows.registrationDays(), filter })
		}),
		nationalityDistribution: t.field({
			type: [nationalityStats],
			description:
				'The countries the delegation members and single participants the filter selects live in; people without an address are left out.',
			resolve: async ({ rows, filter }) =>
				nationalityDistributionOf({ addresses: await rows.addresses(), filter })
		}),
		schoolStats: t.field({
			type: [schoolStats],
			description:
				'The schools of the delegation members and single participants the filter selects, most people first.',
			resolve: async ({ rows, filter }) => schoolStatsOf({ schools: await rows.schools(), filter })
		}),
		waitingList: t.field({
			type: waitingListStats,
			description: 'The waiting list. Ignores the filter.',
			resolve: async ({ rows }) => waitingListOf(await rows.waitingList())
		}),
		supervisorStats: t.field({
			type: supervisorStatsType,
			description: 'The supervisors, accepted or not and attending or not. Ignores the filter.',
			resolve: async ({ rows }) => supervisorStatsOf(await rows.people())
		}),
		postalPaymentProgress: t.field({
			type: postalPaymentProgressType,
			description: 'How far postal registration and payment are. Ignores the filter.',
			resolve: async ({ rows }) => postalPaymentProgressOf(await rows.participantStatus())
		}),
		paperStats: t.field({
			type: paperStatsType,
			description: 'The papers, by type, status and committee. Ignores the filter.',
			resolve: async ({ rows }) => paperStatsOf(await rows.papers())
		})
	})
});

schemaBuilder.queryFields((t) => ({
	getConferenceStatistics: t.field({
		description:
			'The statistics dashboard of a conference, for any member of its team. Only aggregates: no figure names a person. Refused with FORBIDDEN for anybody else.',
		type: StatisticsResult,
		args: {
			conferenceId: t.arg.id({ required: true }),
			filter: t.arg({
				type: StatsFilterEnum,
				defaultValue: 'ALL',
				description:
					'Which registrations the blocks that follow the filter count; ALL when left out.'
			})
		},
		resolve: async (_root, args, ctx) => {
			await assertCanReadStatistics({ ctx, conferenceId: args.conferenceId });

			const conference = await db.query.conference
				.findFirst({
					where: { id: args.conferenceId },
					columns: { startConference: true, applicationDeadline: true }
				})
				.then(assertFindFirstExists);

			return {
				conference,
				filter: args.filter ?? 'ALL',
				rows: statisticsRowsOf(args.conferenceId)
			};
		}
	})
}));
