import { schemaBuilder } from '#api/rumble';

// The GraphQL types of the statistics about the people taking part: their ages, diets, genders,
// where they live and their schools. All of them follow the filter (team members, who have no
// application, are always counted in full). `statisticsViews.ts` computes them.

const dietVariations = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredParticipantDietVariations',
	{
		description: 'People by the food preference in their profile; those without one are left out.',
		fields: (t) => ({
			omnivore: t.int({ description: 'People eating everything.' }),
			vegetarian: t.int({ description: 'People eating vegetarian.' }),
			vegan: t.int({ description: 'People eating vegan.' })
		})
	}
);

const genderVariations = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredParticipantGenderVariations',
	{
		description: 'People by the gender in their profile; those without one are left out.',
		fields: (t) => ({
			male: t.int({ description: 'People stating male.' }),
			female: t.int({ description: 'People stating female.' }),
			diverse: t.int({ description: 'People stating diverse.' }),
			noStatement: t.int({ description: 'People who chose not to state one.' })
		})
	}
);

/** The four columns of the diet and gender matrices, described once. */
const MATRIX_COLUMNS = {
	singleParticipants: 'Single participants the filter selects.',
	delegationMembers: 'Delegation members the filter selects.',
	supervisors: 'Supervisors the filter selects who plan to attend.',
	teamMembers: "The conference's team members, whatever the filter."
};

export const dietType = schemaBuilder.simpleObject('StatisticsResultRegisteredParticipantDiet', {
	description: 'Food preferences, for each kind of part in the conference.',
	fields: (t) => ({
		singleParticipants: t.field({
			type: dietVariations,
			description: MATRIX_COLUMNS.singleParticipants
		}),
		delegationMembers: t.field({
			type: dietVariations,
			description: MATRIX_COLUMNS.delegationMembers
		}),
		supervisors: t.field({ type: dietVariations, description: MATRIX_COLUMNS.supervisors }),
		teamMembers: t.field({ type: dietVariations, description: MATRIX_COLUMNS.teamMembers })
	})
});

export const genderType = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredParticipantGender',
	{
		description: 'Genders, for each kind of part in the conference.',
		fields: (t) => ({
			singleParticipants: t.field({
				type: genderVariations,
				description: MATRIX_COLUMNS.singleParticipants
			}),
			delegationMembers: t.field({
				type: genderVariations,
				description: MATRIX_COLUMNS.delegationMembers
			}),
			supervisors: t.field({ type: genderVariations, description: MATRIX_COLUMNS.supervisors }),
			teamMembers: t.field({ type: genderVariations, description: MATRIX_COLUMNS.teamMembers })
		})
	}
);

const ageCategoryBreakdown = schemaBuilder.simpleObject('StatisticsResultAgeCategoryBreakdown', {
	description: 'How many people of one age are in one category.',
	fields: (t) => ({
		categoryId: t.string({
			description: 'The category, as in `StatisticsResultAgeCategoryStats`.'
		}),
		count: t.int({ description: 'People of the age in the category.' })
	})
});

const ageDistributionEntry = schemaBuilder.simpleObject('StatisticsResultAgeDistributionEntry', {
	description: 'The people of one age.',
	fields: (t) => ({
		age: t.int({ description: 'Age in whole years at the end of the conference.' }),
		count: t.int({ description: 'People of that age.' }),
		byCategory: t.field({
			type: [ageCategoryBreakdown],
			description: 'The same people, split by category.'
		})
	})
});

/** Which kind of registration an age category groups. */
const AgeCategoryType = schemaBuilder.enumType('StatisticsResultAgeCategoryType', {
	description: 'Which kind of registration an age category groups.',
	values: {
		delegationMember: { description: 'Members of delegations.' },
		singleParticipant: { description: 'Single participants.' }
	} as const
});

const ageCategoryStats = schemaBuilder.simpleObject('StatisticsResultAgeCategoryStats', {
	description:
		'The ages in one category: nation delegates, non-state actor delegates, delegation members without an assignment, single participants of one role, or single participants without a role.',
	fields: (t) => ({
		categoryId: t.string({
			description:
				'`nationDelegates`, `nsaParticipants`, `unassignedDelegationMembers`, `unassigned` (single participants without a role) or `role_<roleId>`.'
		}),
		categoryName: t.string({
			description: "The role's name for a role's category, otherwise an English label."
		}),
		categoryType: t.field({
			type: AgeCategoryType,
			description: 'Which kind of registration the category groups.'
		}),
		count: t.int({ description: 'People in the category with a birthday.' }),
		average: t.float({
			nullable: true,
			description: 'Their average age; null when nobody has a birthday.'
		})
	})
});

const ageCommitteeStats = schemaBuilder.simpleObject('StatisticsResultAgeCommitteeStats', {
	description: 'The ages of the nation delegates seated in one committee.',
	fields: (t) => ({
		committeeId: t.string({ description: "The committee's id." }),
		committeeName: t.string({ description: "The committee's name." }),
		abbreviation: t.string({ description: "The committee's abbreviation." }),
		count: t.int({ description: 'Delegates in the committee with a birthday.' }),
		average: t.float({
			nullable: true,
			description: 'Their average age; null when nobody has a birthday.'
		})
	})
});

const ageOverall = schemaBuilder.simpleObject('StatisticsResultAgeOverall', {
	description: 'The ages of everybody the filter selects.',
	fields: (t) => ({
		average: t.float({
			nullable: true,
			description: 'Average age at the end of the conference; null when nobody has a birthday.'
		}),
		total: t.int({ description: 'People with a birthday, whom the average covers.' }),
		missingBirthdays: t.int({ description: 'People left out because they have no birthday.' })
	})
});

export const ageStatsType = schemaBuilder.simpleObject('StatisticsResultAge', {
	description:
		'Ages of delegation members and single participants at the end of the conference. People without a birthday are only counted in `overall.missingBirthdays`.',
	fields: (t) => ({
		overall: t.field({ type: ageOverall, description: 'Everybody together.' }),
		distribution: t.field({
			type: [ageDistributionEntry],
			description: 'How many people have each age, youngest first.'
		}),
		byCategory: t.field({
			type: [ageCategoryStats],
			description: 'Per category: delegations first, then the roles by name, then the rest.'
		}),
		byCommittee: t.field({
			type: [ageCommitteeStats],
			description: 'Per committee of the nation delegates, by name.'
		})
	})
});

export const addressesType = schemaBuilder.simpleObject('StatisticsResultAddresses', {
	description:
		'Delegation members and single participants living in one area: a country and the first three digits of a ZIP code.',
	fields: (t) => ({
		count: t.int({ description: 'People living in the area.' }),
		country: t.string({
			nullable: true,
			description: 'Country of the address (alpha-3); null for people without one.'
		}),
		zipPrefix: t.string({
			nullable: true,
			description: 'The first three digits of the ZIP code; the view groups by area, not by ZIP.'
		}),
		lat: t.float({ nullable: true, description: 'Centre of the area; German ZIPs only.' }),
		lng: t.float({ nullable: true, description: 'Centre of the area; German ZIPs only.' })
	})
});

export const nationalityStats = schemaBuilder.simpleObject('StatisticsResultNationality', {
	description: 'Delegation members and single participants living in one country.',
	fields: (t) => ({
		country: t.string({ description: 'The country of their address (alpha-3).' }),
		count: t.int({ description: 'People living there.' })
	})
});

export const schoolStats = schemaBuilder.simpleObject('StatisticsResultSchool', {
	description: 'The people of one school.',
	fields: (t) => ({
		school: t.string({ description: "The school's name; `Unknown` for people without one." }),
		people: t.int({
			description: 'Delegation members and single participants whose own school it is.'
		})
	})
});
