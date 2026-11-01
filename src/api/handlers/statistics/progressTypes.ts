import { schemaBuilder } from '#api/rumble';

// The GraphQL types of the statistics about the conference's operational state: postal
// registration and payment, the waiting list, the supervisors and the papers. They describe the
// whole conference, whatever the filter. `statisticsViews.ts` computes them.

export const postalPaymentProgressType = schemaBuilder.simpleObject(
	'StatisticsResultPostalPaymentProgress',
	{
		description:
			'Postal registration and payment of the people expected to complete them: delegation members and single participants with a role, and supervisors who attend.',
		fields: (t) => ({
			maxParticipants: t.int({
				description: 'Everybody expected to complete them, the whole the other figures add up to.'
			}),
			postalDone: t.int({ description: 'Expected people whose postal registration is complete.' }),
			postalPending: t.int({
				description: 'Expected people whose postal registration is neither complete nor faulty.'
			}),
			postalProblem: t.int({
				description: 'Expected people whose postal registration has a problem.'
			}),
			postalPercentage: t.int({
				description:
					'`postalDone` of `maxParticipants`, in whole percent; 0 when nobody is expected.'
			}),
			paymentDone: t.int({ description: 'Expected people whose payment is complete.' }),
			paymentPending: t.int({ description: 'Expected people whose payment is still open.' }),
			paymentProblem: t.int({ description: 'Expected people whose payment has a problem.' }),
			paymentPercentage: t.int({
				description:
					'`paymentDone` of `maxParticipants`, in whole percent; 0 when nobody is expected.'
			}),
			bothComplete: t.int({ description: 'Expected people done with both.' }),
			postalOnlyComplete: t.int({
				description: 'Expected people done with the postal registration but not the payment.'
			}),
			paymentOnlyComplete: t.int({
				description: 'Expected people done with the payment but not the postal registration.'
			}),
			neitherComplete: t.int({
				description: 'Expected people done with neither, including those nothing is recorded for.'
			})
		})
	}
);

export const waitingListStats = schemaBuilder.simpleObject('StatisticsResultWaitingList', {
	description: "The conference's waiting list.",
	fields: (t) => ({
		total: t.int({ description: 'Every entry.' }),
		visible: t.int({ description: 'Entries the team has not hidden.' }),
		hidden: t.int({ description: 'Entries the team has hidden.' }),
		assigned: t.int({ description: 'Entries that got a seat.' }),
		unassigned: t.int({ description: 'Entries still waiting for a seat.' })
	})
});

export const supervisorStatsType = schemaBuilder.simpleObject('StatisticsResultSupervisorStats', {
	description:
		'Supervisors, by whether one of the people they supervise got a role ("accepted") and whether they plan to attend.',
	fields: (t) => ({
		total: t.int({ description: 'Every supervisor.' }),
		accepted: t.int({ description: 'Supervisors of whom someone they supervise got a role.' }),
		rejected: t.int({ description: 'Supervisors of whom nobody they supervise got a role.' }),
		plansAttendance: t.int({ description: 'Supervisors who plan to attend.' }),
		doesNotPlanAttendance: t.int({ description: 'Supervisors who do not plan to attend.' }),
		acceptedAndPresent: t.int({ description: 'Accepted supervisors who plan to attend.' }),
		acceptedAndNotPresent: t.int({
			description: 'Accepted supervisors who do not plan to attend.'
		}),
		rejectedAndPresent: t.int({ description: 'Rejected supervisors who plan to attend.' }),
		rejectedAndNotPresent: t.int({
			description: 'Rejected supervisors who do not plan to attend.'
		})
	})
});

const papersByTypeStats = schemaBuilder.simpleObject('StatisticsResultPapersByType', {
	description: 'Papers by type.',
	fields: (t) => ({
		positionPaper: t.int({ description: 'Position papers.' }),
		workingPaper: t.int({ description: 'Working papers.' }),
		introductionPaper: t.int({ description: 'Introduction papers.' })
	})
});

const papersByStatusStats = schemaBuilder.simpleObject('StatisticsResultPapersByStatus', {
	description: 'Papers by the status of their review.',
	fields: (t) => ({
		draft: t.int({ description: 'Papers not submitted yet.' }),
		submitted: t.int({ description: 'Papers submitted and waiting for a review.' }),
		changesRequested: t.int({ description: 'Papers a reviewer sent back for changes.' }),
		accepted: t.int({ description: 'Papers accepted by a reviewer.' })
	})
});

const papersByCommitteeStats = schemaBuilder.simpleObject('StatisticsResultPapersByCommittee', {
	description: 'The papers written for one committee.',
	fields: (t) => ({
		committeeId: t.string({ description: "The committee's id." }),
		name: t.string({ description: "The committee's name." }),
		abbreviation: t.string({ description: "The committee's abbreviation." }),
		count: t.int({ description: 'Papers for the committee.' })
	})
});

export const paperStatsType = schemaBuilder.simpleObject('StatisticsResultPaperStats', {
	description: "The conference's papers.",
	fields: (t) => ({
		total: t.int({ description: 'Every paper.' }),
		byType: t.field({ type: papersByTypeStats, description: 'Papers by type.' }),
		byStatus: t.field({ type: papersByStatusStats, description: 'Papers by status.' }),
		withReviews: t.int({ description: 'Papers with at least one review.' }),
		withoutReviews: t.int({ description: 'Papers without any review.' }),
		byCommittee: t.field({
			type: [papersByCommitteeStats],
			description:
				'Papers per committee of their agenda item; papers without an agenda item are left out.'
		})
	})
});
