import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Relations are derived from prisma/schema.prisma rather than from drizzle-kit`s
 * introspection. Introspection collapses a join table into a many-to-many shortcut
 * (conference -> usersViaTeamMember), which hides the join row and makes its columns -
 * TeamMember.role among them - unfilterable. Almost every authorization rule needs that
 * role, so the join tables are exposed as first-class relations here, the way chase
 * writes them by hand. Field names match the Prisma ones so GraphQL field names are
 * unchanged.
 */
export const relations = defineRelations(schema, (r) => ({
	attendanceEntry: {
		conferenceParticipantStatus: r.one.conferenceParticipantStatus({
			from: r.attendanceEntry.conferenceParticipantStatusId,
			to: r.conferenceParticipantStatus.id,
			optional: false
		}),
		recordedBy: r.one.user({
			from: r.attendanceEntry.recordedById,
			to: r.user.id,
			optional: false
		})
	},
	calendarDay: {
		conference: r.one.conference({
			from: r.calendarDay.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		entries: r.many.calendarEntry({
			from: r.calendarDay.id,
			to: r.calendarEntry.calendarDayId
		}),
		tracks: r.many.calendarTrack({
			from: r.calendarDay.id,
			to: r.calendarTrack.calendarDayId
		})
	},
	calendarEntry: {
		calendarDay: r.one.calendarDay({
			from: r.calendarEntry.calendarDayId,
			to: r.calendarDay.id,
			optional: false
		}),
		calendarTrack: r.one.calendarTrack({
			from: r.calendarEntry.calendarTrackId,
			to: r.calendarTrack.id
		}),
		place: r.one.place({
			from: r.calendarEntry.placeId,
			to: r.place.id
		})
	},
	calendarTrack: {
		calendarDay: r.one.calendarDay({
			from: r.calendarTrack.calendarDayId,
			to: r.calendarDay.id,
			optional: false
		}),
		entries: r.many.calendarEntry({
			from: r.calendarTrack.id,
			to: r.calendarEntry.calendarTrackId
		})
	},
	committee: {
		CommitteeAgendaItem: r.many.committeeAgendaItem({
			from: r.committee.id,
			to: r.committeeAgendaItem.committeeId
		}),
		conference: r.one.conference({
			from: r.committee.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		delegationMembers: r.many.delegationMember({
			from: r.committee.id,
			to: r.delegationMember.assignedCommitteeId
		}),
		nations: r.many.nation({
			from: r.committee.id.through(r.committeeToNation.a),
			to: r.nation.alpha3Code.through(r.committeeToNation.b)
		})
	},
	committeeAgendaItem: {
		committee: r.one.committee({
			from: r.committeeAgendaItem.committeeId,
			to: r.committee.id,
			optional: false
		}),
		papers: r.many.paper({
			from: r.committeeAgendaItem.id,
			to: r.paper.agendaItemId
		})
	},
	conference: {
		WaitingListEntry: r.many.waitingListEntry({
			from: r.conference.id,
			to: r.waitingListEntry.conferenceId
		}),
		calendarDays: r.many.calendarDay({
			from: r.conference.id,
			to: r.calendarDay.conferenceId
		}),
		committees: r.many.committee({
			from: r.conference.id,
			to: r.committee.conferenceId
		}),
		conferenceSupervisors: r.many.conferenceSupervisor({
			from: r.conference.id,
			to: r.conferenceSupervisor.conferenceId
		}),
		conferenceUserStatus: r.many.conferenceParticipantStatus({
			from: r.conference.id,
			to: r.conferenceParticipantStatus.conferenceId
		}),
		delegationMembers: r.many.delegationMember({
			from: r.conference.id,
			to: r.delegationMember.conferenceId
		}),
		delegations: r.many.delegation({
			from: r.conference.id,
			to: r.delegation.conferenceId
		}),
		individualApplicationOptions: r.many.customConferenceRole({
			from: r.conference.id,
			to: r.customConferenceRole.conferenceId
		}),
		nonStateActors: r.many.nonStateActor({
			from: r.conference.id,
			to: r.nonStateActor.conferenceId
		}),
		papers: r.many.paper({
			from: r.conference.id,
			to: r.paper.conferenceId
		}),
		paymentTransactions: r.many.paymentTransaction({
			from: r.conference.id,
			to: r.paymentTransaction.conferenceId
		}),
		places: r.many.place({
			from: r.conference.id,
			to: r.place.conferenceId
		}),
		singleParticipants: r.many.singleParticipant({
			from: r.conference.id,
			to: r.singleParticipant.conferenceId
		}),
		surveyQuestions: r.many.surveyQuestion({
			from: r.conference.id,
			to: r.surveyQuestion.conferenceId
		}),
		teamMemberInvitations: r.many.teamMemberInvitation({
			from: r.conference.id,
			to: r.teamMemberInvitation.conferenceId
		}),
		teamMembers: r.many.teamMember({
			from: r.conference.id,
			to: r.teamMember.conferenceId
		})
	},
	conferenceParticipantStatus: {
		attendanceEntries: r.many.attendanceEntry({
			from: r.conferenceParticipantStatus.id,
			to: r.attendanceEntry.conferenceParticipantStatusId
		}),
		conference: r.one.conference({
			from: r.conferenceParticipantStatus.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		user: r.one.user({
			from: r.conferenceParticipantStatus.userId,
			to: r.user.id,
			optional: false
		})
	},
	conferenceSupervisor: {
		conference: r.one.conference({
			from: r.conferenceSupervisor.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		supervisedDelegationMembers: r.many.delegationMember({
			from: r.conferenceSupervisor.id.through(r.conferenceSupervisorToDelegationMember.a),
			to: r.delegationMember.id.through(r.conferenceSupervisorToDelegationMember.b)
		}),
		supervisedSingleParticipants: r.many.singleParticipant({
			from: r.conferenceSupervisor.id.through(r.conferenceSupervisorToSingleParticipant.a),
			to: r.singleParticipant.id.through(r.conferenceSupervisorToSingleParticipant.b)
		}),
		user: r.one.user({
			from: r.conferenceSupervisor.userId,
			to: r.user.id,
			optional: false
		})
	},
	customConferenceRole: {
		conference: r.one.conference({
			from: r.customConferenceRole.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		singleParticipant: r.many.singleParticipant({
			from: r.customConferenceRole.id.through(r.customConferenceRoleToSingleParticipant.a),
			to: r.singleParticipant.id.through(r.customConferenceRoleToSingleParticipant.b)
		}),
		singleParticipantAssignments: r.many.singleParticipant({
			from: r.customConferenceRole.id,
			to: r.singleParticipant.assignedRoleId
		})
	},
	delegation: {
		appliedForRoles: r.many.roleApplication({
			from: r.delegation.id,
			to: r.roleApplication.delegationId
		}),
		assignedNation: r.one.nation({
			from: r.delegation.assignedNationAlpha3Code,
			to: r.nation.alpha3Code
		}),
		assignedNonStateActor: r.one.nonStateActor({
			from: r.delegation.assignedNonStateActorId,
			to: r.nonStateActor.id
		}),
		conference: r.one.conference({
			from: r.delegation.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		members: r.many.delegationMember({
			from: r.delegation.id,
			to: r.delegationMember.delegationId
		}),
		papers: r.many.paper({
			from: r.delegation.id,
			to: r.paper.delegationId
		})
	},
	delegationMember: {
		assignedCommittee: r.one.committee({
			from: r.delegationMember.assignedCommitteeId,
			to: r.committee.id
		}),
		conference: r.one.conference({
			from: r.delegationMember.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		delegation: r.one.delegation({
			from: r.delegationMember.delegationId,
			to: r.delegation.id,
			optional: false
		}),
		supervisors: r.many.conferenceSupervisor({
			from: r.delegationMember.id.through(r.conferenceSupervisorToDelegationMember.b),
			to: r.conferenceSupervisor.id.through(r.conferenceSupervisorToDelegationMember.a)
		}),
		user: r.one.user({
			from: r.delegationMember.userId,
			to: r.user.id,
			optional: false
		})
	},
	nation: {
		assignedDelegations: r.many.delegation({
			from: r.nation.alpha3Code,
			to: r.delegation.assignedNationAlpha3Code
		}),
		committees: r.many.committee({
			from: r.nation.alpha3Code.through(r.committeeToNation.b),
			to: r.committee.id.through(r.committeeToNation.a)
		}),
		roleApplications: r.many.roleApplication({
			from: r.nation.alpha3Code,
			to: r.roleApplication.nationId
		})
	},
	nonStateActor: {
		assignedDelegations: r.many.delegation({
			from: r.nonStateActor.id,
			to: r.delegation.assignedNonStateActorId
		}),
		conference: r.one.conference({
			from: r.nonStateActor.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		roleApplications: r.many.roleApplication({
			from: r.nonStateActor.id,
			to: r.roleApplication.nonStateActorId
		})
	},
	paper: {
		agendaItem: r.one.committeeAgendaItem({
			from: r.paper.agendaItemId,
			to: r.committeeAgendaItem.id
		}),
		author: r.one.user({
			from: r.paper.authorId,
			to: r.user.id,
			optional: false
		}),
		conference: r.one.conference({
			from: r.paper.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		delegation: r.one.delegation({
			from: r.paper.delegationId,
			to: r.delegation.id,
			optional: false
		}),
		versions: r.many.paperVersion({
			from: r.paper.id,
			to: r.paperVersion.paperId
		})
	},
	paperReview: {
		paperVersion: r.one.paperVersion({
			from: r.paperReview.paperVersionId,
			to: r.paperVersion.id,
			optional: false
		}),
		reviewer: r.one.user({
			from: r.paperReview.reviewerId,
			to: r.user.id,
			optional: false
		})
	},
	paperVersion: {
		paper: r.one.paper({
			from: r.paperVersion.paperId,
			to: r.paper.id,
			optional: false
		}),
		reviews: r.many.paperReview({
			from: r.paperVersion.id,
			to: r.paperReview.paperVersionId
		})
	},
	paymentTransaction: {
		conference: r.one.conference({
			from: r.paymentTransaction.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		paymentFor: r.many.userReferenceInPaymentTransaction({
			from: r.paymentTransaction.id,
			to: r.userReferenceInPaymentTransaction.paymentTransactionId
		}),
		user: r.one.user({
			from: r.paymentTransaction.userId,
			to: r.user.id,
			optional: false
		})
	},
	place: {
		calendarEntries: r.many.calendarEntry({
			from: r.place.id,
			to: r.calendarEntry.placeId
		}),
		conference: r.one.conference({
			from: r.place.conferenceId,
			to: r.conference.id,
			optional: false
		})
	},
	reviewerSnippet: {
		user: r.one.user({
			from: r.reviewerSnippet.userId,
			to: r.user.id,
			optional: false
		})
	},
	roleApplication: {
		delegation: r.one.delegation({
			from: r.roleApplication.delegationId,
			to: r.delegation.id,
			optional: false
		}),
		nation: r.one.nation({
			from: r.roleApplication.nationId,
			to: r.nation.alpha3Code,
			optional: false
		}),
		nonStateActor: r.one.nonStateActor({
			from: r.roleApplication.nonStateActorId,
			to: r.nonStateActor.id,
			optional: false
		})
	},
	singleParticipant: {
		appliedForRoles: r.many.customConferenceRole({
			from: r.singleParticipant.id.through(r.customConferenceRoleToSingleParticipant.b),
			to: r.customConferenceRole.id.through(r.customConferenceRoleToSingleParticipant.a)
		}),
		assignedRole: r.one.customConferenceRole({
			from: r.singleParticipant.assignedRoleId,
			to: r.customConferenceRole.id
		}),
		conference: r.one.conference({
			from: r.singleParticipant.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		supervisors: r.many.conferenceSupervisor({
			from: r.singleParticipant.id.through(r.conferenceSupervisorToSingleParticipant.b),
			to: r.conferenceSupervisor.id.through(r.conferenceSupervisorToSingleParticipant.a)
		}),
		user: r.one.user({
			from: r.singleParticipant.userId,
			to: r.user.id,
			optional: false
		})
	},
	surveyAnswer: {
		option: r.one.surveyOption({
			from: r.surveyAnswer.optionId,
			to: r.surveyOption.id,
			optional: false
		}),
		question: r.one.surveyQuestion({
			from: r.surveyAnswer.questionId,
			to: r.surveyQuestion.id,
			optional: false
		}),
		user: r.one.user({
			from: r.surveyAnswer.userId,
			to: r.user.id,
			optional: false
		})
	},
	surveyOption: {
		question: r.one.surveyQuestion({
			from: r.surveyOption.questionId,
			to: r.surveyQuestion.id,
			optional: false
		}),
		surveyAnswers: r.many.surveyAnswer({
			from: r.surveyOption.id,
			to: r.surveyAnswer.optionId
		})
	},
	surveyQuestion: {
		conference: r.one.conference({
			from: r.surveyQuestion.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		options: r.many.surveyOption({
			from: r.surveyQuestion.id,
			to: r.surveyOption.questionId
		}),
		surveyAnswers: r.many.surveyAnswer({
			from: r.surveyQuestion.id,
			to: r.surveyAnswer.questionId
		})
	},
	teamMember: {
		conference: r.one.conference({
			from: r.teamMember.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		user: r.one.user({
			from: r.teamMember.userId,
			to: r.user.id,
			optional: false
		})
	},
	teamMemberInvitation: {
		acceptedBy: r.one.user({
			from: r.teamMemberInvitation.acceptedById,
			to: r.user.id
		}),
		conference: r.one.conference({
			from: r.teamMemberInvitation.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		invitedBy: r.one.user({
			from: r.teamMemberInvitation.invitedById,
			to: r.user.id,
			optional: false
		})
	},
	user: {
		conferenceParticipantStatus: r.many.conferenceParticipantStatus({
			from: r.user.id,
			to: r.conferenceParticipantStatus.userId
		}),
		conferenceSupervisor: r.many.conferenceSupervisor({
			from: r.user.id,
			to: r.conferenceSupervisor.userId
		}),
		delegationMemberships: r.many.delegationMember({
			from: r.user.id,
			to: r.delegationMember.userId
		}),
		invitationsAccepted: r.many.teamMemberInvitation({
			from: r.user.id,
			to: r.teamMemberInvitation.acceptedById
		}),
		invitationsSent: r.many.teamMemberInvitation({
			from: r.user.id,
			to: r.teamMemberInvitation.invitedById
		}),
		ownPaymentTransactions: r.many.paymentTransaction({
			from: r.user.id,
			to: r.paymentTransaction.userId
		}),
		paperReviews: r.many.paperReview({
			from: r.user.id,
			to: r.paperReview.reviewerId
		}),
		papers: r.many.paper({
			from: r.user.id,
			to: r.paper.authorId
		}),
		paymentTransactionsReferences: r.many.userReferenceInPaymentTransaction({
			from: r.user.id,
			to: r.userReferenceInPaymentTransaction.userId
		}),
		recordedAttendanceEntries: r.many.attendanceEntry({
			from: r.user.id,
			to: r.attendanceEntry.recordedById
		}),
		reviewerSnippets: r.many.reviewerSnippet({
			from: r.user.id,
			to: r.reviewerSnippet.userId
		}),
		singleParticipant: r.many.singleParticipant({
			from: r.user.id,
			to: r.singleParticipant.userId
		}),
		surveyAnswers: r.many.surveyAnswer({
			from: r.user.id,
			to: r.surveyAnswer.userId
		}),
		teamMember: r.many.teamMember({
			from: r.user.id,
			to: r.teamMember.userId
		}),
		waitingListEntry: r.many.waitingListEntry({
			from: r.user.id,
			to: r.waitingListEntry.userId
		})
	},
	userReferenceInPaymentTransaction: {
		paymentTransaction: r.one.paymentTransaction({
			from: r.userReferenceInPaymentTransaction.paymentTransactionId,
			to: r.paymentTransaction.id,
			optional: false
		}),
		user: r.one.user({
			from: r.userReferenceInPaymentTransaction.userId,
			to: r.user.id,
			optional: false
		})
	},
	waitingListEntry: {
		conference: r.one.conference({
			from: r.waitingListEntry.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		user: r.one.user({
			from: r.waitingListEntry.userId,
			to: r.user.id,
			optional: false
		})
	}
}));
