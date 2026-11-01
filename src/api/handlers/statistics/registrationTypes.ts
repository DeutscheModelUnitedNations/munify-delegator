import { schemaBuilder } from '#api/rumble';

// The GraphQL types of the statistics about registrations: how many registered and applied, the
// roles they got, the committee seats and the registrations over time. `statisticsViews.ts`
// computes them.

export const countdownsType = schemaBuilder.simpleObject('StatisticsResultCountdowns', {
	description: 'Whole days left until the dates the team works towards.',
	fields: (t) => ({
		daysUntilConference: t.int({
			description: 'Days until the conference starts; negative once it has.'
		}),
		daysUntilEndRegistration: t.int({
			description: 'Days until the application deadline; negative once it has passed.'
		})
	})
});

/** The descriptions of `total`, `applied` and `notApplied` for the registrations they count. */
function appliedSplit(what: string) {
	return {
		total: `Every registered ${what}, whether applied or not.`,
		applied: `The ${what} that have sent their application.`,
		notApplied: `The ${what} that have not sent their application yet.`
	};
}

const delegationsSplit = appliedSplit('delegations');
const membersSplit = appliedSplit('delegation members');
const roleWishSplit = appliedSplit('single participants wishing for the role');
const singlesSplit = appliedSplit('single participants');
const peopleSplit = appliedSplit('delegation members and single participants');

const registeredDelegations = schemaBuilder.simpleObject('StatisticsResultRegisteredDelegations', {
	description: 'Delegations, counted as one each.',
	fields: (t) => ({
		total: t.int({ description: delegationsSplit.total }),
		applied: t.int({ description: delegationsSplit.applied }),
		notApplied: t.int({ description: delegationsSplit.notApplied })
	})
});

const registeredDelegationMembers = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredDelegationMembers',
	{
		description: 'Delegation members, counted by the application of their delegation.',
		fields: (t) => ({
			total: t.int({ description: membersSplit.total }),
			applied: t.int({ description: membersSplit.applied }),
			notApplied: t.int({ description: membersSplit.notApplied })
		})
	}
);

const registeredSingleParticipantsByRole = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredSingleParticipantsByRole',
	{
		description:
			'Single participants who named one custom role among their wishes; someone naming several counts for each.',
		fields: (t) => ({
			role: t.string({ description: "The custom role's name." }),
			fontAwesomeIcon: t.string({
				nullable: true,
				description: "The role's icon (a FontAwesome name without the `fa-` prefix), if it has one."
			}),
			total: t.int({ description: roleWishSplit.total }),
			applied: t.int({ description: roleWishSplit.applied }),
			notApplied: t.int({ description: roleWishSplit.notApplied })
		})
	}
);

const registeredSingleParticipants = schemaBuilder.simpleObject(
	'StatisticsResultRegisteredSingleParticipants',
	{
		description: 'Single participants, and the custom roles they wish for.',
		fields: (t) => ({
			total: t.int({ description: singlesSplit.total }),
			applied: t.int({ description: singlesSplit.applied }),
			notApplied: t.int({ description: singlesSplit.notApplied }),
			byRole: t.field({
				type: [registeredSingleParticipantsByRole],
				description: 'Every custom role of the conference, by name, with who wishes for it.'
			})
		})
	}
);

export const registeredType = schemaBuilder.simpleObject('StatisticsResultRegistered', {
	description:
		'How many registered and applied. Everything but `supervisors` covers the whole conference, whatever the filter.',
	fields: (t) => ({
		total: t.int({ description: peopleSplit.total }),
		applied: t.int({ description: peopleSplit.applied }),
		notApplied: t.int({ description: peopleSplit.notApplied }),
		delegations: t.field({ type: registeredDelegations, description: 'The delegations.' }),
		delegationMembers: t.field({
			type: registeredDelegationMembers,
			description: 'The members of the delegations.'
		}),
		singleParticipants: t.field({
			type: registeredSingleParticipants,
			description: 'The single participants.'
		}),
		supervisors: t.int({
			description:
				'Supervisors the filter selects; a supervisor takes `applied` and the role from the people they supervise.'
		})
	})
});

export const roleBasedStats = schemaBuilder.simpleObject('StatisticsResultRoleBased', {
	description:
		'Who got a role, among the registrations the filter selects. A side the filter excludes (with or without a role) is 0.',
	fields: (t) => ({
		delegationMembersWithRole: t.int({
			description: 'Members of delegations with a nation or a non-state actor.'
		}),
		delegationMembersWithoutRole: t.int({
			description: 'Members of delegations without a nation or non-state actor.'
		}),
		delegationMembersWithCommittee: t.int({
			description:
				'Members of applied nation delegations seated in a committee. Ignores the filter: committee seats exist only for nations.'
		}),
		delegationMembersWithoutCommittee: t.int({
			description:
				'Members of applied nation delegations not yet seated in a committee. Ignores the filter.'
		}),
		singleParticipantsWithRole: t.int({
			description: 'Single participants with a custom role.'
		}),
		singleParticipantsWithoutRole: t.int({
			description: 'Single participants without a custom role.'
		}),
		delegationsWithAssignment: t.int({
			description: 'Delegations with a nation or a non-state actor.'
		}),
		delegationsWithoutAssignment: t.int({
			description: 'Delegations without a nation or non-state actor.'
		})
	})
});

export const committeeFillRate = schemaBuilder.simpleObject('StatisticsResultCommitteeFillRate', {
	description:
		"One committee's seats and how many of them applied delegations' members hold. Ignores the filter.",
	fields: (t) => ({
		committeeId: t.id({ description: "The committee's id." }),
		name: t.string({ description: "The committee's name." }),
		abbreviation: t.string({ description: "The committee's abbreviation." }),
		totalSeats: t.int({ description: 'Every seat of the committee, over all its nations.' }),
		assignedSeats: t.int({ description: 'The seats a delegation member is assigned to.' }),
		fillPercentage: t.int({
			description: '`assignedSeats` of `totalSeats`, in whole percent; 0 without seats.'
		})
	})
});

export const registrationTimelineEntry = schemaBuilder.simpleObject(
	'StatisticsResultRegistrationTimeline',
	{
		description:
			'The registrations up to and including one day, among those the filter selects. Days without registrations are listed too, so the days run without gaps.',
		fields: (t) => ({
			date: t.string({ description: 'The day, as `YYYY-MM-DD` (UTC).' }),
			cumulativeDelegations: t.int({ description: 'Delegations created up to the day.' }),
			cumulativeDelegationMembers: t.int({
				description: 'Members of the delegations created up to the day, as they are now.'
			}),
			cumulativeSingleParticipants: t.int({
				description: 'Single participants registered up to the day.'
			}),
			cumulativeSupervisors: t.int({ description: 'Supervisors registered up to the day.' })
		})
	}
);
