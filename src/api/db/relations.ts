import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

export const relations = defineRelations(schema, (r) => ({
	committee: {
		nations: r.many.nation({
			from: r.committee.id.through(r.committeeToNation.a),
			to: r.nation.alpha3Code.through(r.committeeToNation.b)
		}),
		conference: r.one.conference({
			from: r.committee.conferenceId,
			to: r.conference.id
		}),
		committeeAgendaItems: r.many.committeeAgendaItem(),
		delegationMembers: r.many.delegationMember()
	},
	nation: {
		committees: r.many.committee(),
		delegations: r.many.delegation(),
		roleApplications: r.many.roleApplication()
	},
	conferenceSupervisor: {
		delegationMembers: r.many.delegationMember({
			from: r.conferenceSupervisor.id.through(r.conferenceSupervisorToDelegationMember.a),
			to: r.delegationMember.id.through(r.conferenceSupervisorToDelegationMember.b)
		}),
		singleParticipants: r.many.singleParticipant({
			from: r.conferenceSupervisor.id.through(r.conferenceSupervisorToSingleParticipant.a),
			to: r.singleParticipant.id.through(r.conferenceSupervisorToSingleParticipant.b)
		})
	},
	delegationMember: {
		conferenceSupervisors: r.many.conferenceSupervisor(),
		committee: r.one.committee({
			from: r.delegationMember.assignedCommitteeId,
			to: r.committee.id
		}),
		conference: r.one.conference({
			from: r.delegationMember.conferenceId,
			to: r.conference.id
		}),
		delegation: r.one.delegation({
			from: r.delegationMember.delegationId,
			to: r.delegation.id
		}),
		user: r.one.user({
			from: r.delegationMember.userId,
			to: r.user.id
		})
	},
	singleParticipant: {
		conferenceSupervisors: r.many.conferenceSupervisor(),
		customConferenceRoles: r.many.customConferenceRole({
			alias:
				'customConferenceRole_id_singleParticipant_id_via_customConferenceRoleToSingleParticipant'
		}),
		customConferenceRole: r.one.customConferenceRole({
			from: r.singleParticipant.assignedRoleId,
			to: r.customConferenceRole.id,
			alias: 'singleParticipant_assignedRoleId_customConferenceRole_id'
		}),
		conference: r.one.conference({
			from: r.singleParticipant.conferenceId,
			to: r.conference.id
		}),
		user: r.one.user({
			from: r.singleParticipant.userId,
			to: r.user.id
		})
	},
	customConferenceRole: {
		singleParticipantsViaCustomConferenceRoleToSingleParticipant: r.many.singleParticipant({
			from: r.customConferenceRole.id.through(r.customConferenceRoleToSingleParticipant.a),
			to: r.singleParticipant.id.through(r.customConferenceRoleToSingleParticipant.b),
			alias:
				'customConferenceRole_id_singleParticipant_id_via_customConferenceRoleToSingleParticipant'
		}),
		conference: r.one.conference({
			from: r.customConferenceRole.conferenceId,
			to: r.conference.id
		}),
		singleParticipantsAssignedRoleId: r.many.singleParticipant({
			alias: 'singleParticipant_assignedRoleId_customConferenceRole_id'
		})
	},
	conferenceParticipantStatus: {
		users: r.many.user({
			from: r.conferenceParticipantStatus.id.through(
				r.attendanceEntry.conferenceParticipantStatusId
			),
			to: r.user.id.through(r.attendanceEntry.recordedById)
		})
	},
	user: {
		conferenceParticipantStatuses: r.many.conferenceParticipantStatus(),
		conferencesViaConferenceParticipantStatus: r.many.conference({
			alias: 'conference_id_user_id_via_conferenceParticipantStatus'
		}),
		conferencesViaConferenceSupervisor: r.many.conference({
			alias: 'conference_id_user_id_via_conferenceSupervisor'
		}),
		delegationMembers: r.many.delegationMember(),
		papers: r.many.paper(),
		paperVersions: r.many.paperVersion(),
		conferencesViaPaymentTransaction: r.many.conference({
			alias: 'conference_id_user_id_via_paymentTransaction'
		}),
		reviewerSnippets: r.many.reviewerSnippet(),
		singleParticipants: r.many.singleParticipant(),
		surveyAnswers: r.many.surveyAnswer(),
		conferencesViaTeamMember: r.many.conference({
			alias: 'conference_id_user_id_via_teamMember'
		}),
		teamMemberInvitationsAcceptedById: r.many.teamMemberInvitation({
			alias: 'teamMemberInvitation_acceptedById_user_id'
		}),
		teamMemberInvitationsInvitedById: r.many.teamMemberInvitation({
			alias: 'teamMemberInvitation_invitedById_user_id'
		}),
		paymentTransactions: r.many.paymentTransaction(),
		conferencesViaWaitingListEntry: r.many.conference({
			alias: 'conference_id_user_id_via_waitingListEntry'
		})
	},
	calendarDay: {
		conference: r.one.conference({
			from: r.calendarDay.conferenceId,
			to: r.conference.id
		}),
		calendarEntries: r.many.calendarEntry(),
		calendarTracks: r.many.calendarTrack()
	},
	conference: {
		calendarDays: r.many.calendarDay(),
		committees: r.many.committee(),
		usersViaConferenceParticipantStatus: r.many.user({
			from: r.conference.id.through(r.conferenceParticipantStatus.conferenceId),
			to: r.user.id.through(r.conferenceParticipantStatus.userId),
			alias: 'conference_id_user_id_via_conferenceParticipantStatus'
		}),
		usersViaConferenceSupervisor: r.many.user({
			from: r.conference.id.through(r.conferenceSupervisor.conferenceId),
			to: r.user.id.through(r.conferenceSupervisor.userId),
			alias: 'conference_id_user_id_via_conferenceSupervisor'
		}),
		customConferenceRoles: r.many.customConferenceRole(),
		delegations: r.many.delegation(),
		delegationMembers: r.many.delegationMember(),
		nonStateActors: r.many.nonStateActor(),
		papers: r.many.paper(),
		usersViaPaymentTransaction: r.many.user({
			from: r.conference.id.through(r.paymentTransaction.conferenceId),
			to: r.user.id.through(r.paymentTransaction.userId),
			alias: 'conference_id_user_id_via_paymentTransaction'
		}),
		places: r.many.place(),
		singleParticipants: r.many.singleParticipant(),
		surveyQuestions: r.many.surveyQuestion(),
		usersViaTeamMember: r.many.user({
			from: r.conference.id.through(r.teamMember.conferenceId),
			to: r.user.id.through(r.teamMember.userId),
			alias: 'conference_id_user_id_via_teamMember'
		}),
		teamMemberInvitations: r.many.teamMemberInvitation(),
		usersViaWaitingListEntry: r.many.user({
			from: r.conference.id.through(r.waitingListEntry.conferenceId),
			to: r.user.id.through(r.waitingListEntry.userId),
			alias: 'conference_id_user_id_via_waitingListEntry'
		})
	},
	calendarEntry: {
		calendarDay: r.one.calendarDay({
			from: r.calendarEntry.calendarDayId,
			to: r.calendarDay.id
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
		calendarEntries: r.many.calendarEntry(),
		calendarDay: r.one.calendarDay({
			from: r.calendarTrack.calendarDayId,
			to: r.calendarDay.id
		})
	},
	place: {
		calendarEntries: r.many.calendarEntry(),
		conference: r.one.conference({
			from: r.place.conferenceId,
			to: r.conference.id
		})
	},
	committeeAgendaItem: {
		committee: r.one.committee({
			from: r.committeeAgendaItem.committeeId,
			to: r.committee.id
		}),
		papers: r.many.paper()
	},
	delegation: {
		nation: r.one.nation({
			from: r.delegation.assignedNationAlpha3Code,
			to: r.nation.alpha3Code
		}),
		nonStateActor: r.one.nonStateActor({
			from: r.delegation.assignedNonStateActorId,
			to: r.nonStateActor.id
		}),
		conference: r.one.conference({
			from: r.delegation.conferenceId,
			to: r.conference.id
		}),
		delegationMembers: r.many.delegationMember(),
		papers: r.many.paper(),
		roleApplications: r.many.roleApplication()
	},
	nonStateActor: {
		delegations: r.many.delegation(),
		conference: r.one.conference({
			from: r.nonStateActor.conferenceId,
			to: r.conference.id
		}),
		roleApplications: r.many.roleApplication()
	},
	paper: {
		committeeAgendaItem: r.one.committeeAgendaItem({
			from: r.paper.agendaItemId,
			to: r.committeeAgendaItem.id
		}),
		user: r.one.user({
			from: r.paper.authorId,
			to: r.user.id
		}),
		conference: r.one.conference({
			from: r.paper.conferenceId,
			to: r.conference.id
		}),
		delegation: r.one.delegation({
			from: r.paper.delegationId,
			to: r.delegation.id
		}),
		paperVersions: r.many.paperVersion()
	},
	paperVersion: {
		users: r.many.user({
			from: r.paperVersion.id.through(r.paperReview.paperVersionId),
			to: r.user.id.through(r.paperReview.reviewerId)
		}),
		paper: r.one.paper({
			from: r.paperVersion.paperId,
			to: r.paper.id
		})
	},
	reviewerSnippet: {
		user: r.one.user({
			from: r.reviewerSnippet.userId,
			to: r.user.id
		})
	},
	roleApplication: {
		delegation: r.one.delegation({
			from: r.roleApplication.delegationId,
			to: r.delegation.id
		}),
		nation: r.one.nation({
			from: r.roleApplication.nationId,
			to: r.nation.alpha3Code
		}),
		nonStateActor: r.one.nonStateActor({
			from: r.roleApplication.nonStateActorId,
			to: r.nonStateActor.id
		})
	},
	surveyAnswer: {
		surveyOption: r.one.surveyOption({
			from: r.surveyAnswer.optionId,
			to: r.surveyOption.id
		}),
		surveyQuestion: r.one.surveyQuestion({
			from: r.surveyAnswer.questionId,
			to: r.surveyQuestion.id
		}),
		user: r.one.user({
			from: r.surveyAnswer.userId,
			to: r.user.id
		})
	},
	surveyOption: {
		surveyAnswers: r.many.surveyAnswer(),
		surveyQuestion: r.one.surveyQuestion({
			from: r.surveyOption.questionId,
			to: r.surveyQuestion.id
		})
	},
	surveyQuestion: {
		surveyAnswers: r.many.surveyAnswer(),
		surveyOptions: r.many.surveyOption(),
		conference: r.one.conference({
			from: r.surveyQuestion.conferenceId,
			to: r.conference.id
		})
	},
	teamMemberInvitation: {
		userAcceptedById: r.one.user({
			from: r.teamMemberInvitation.acceptedById,
			to: r.user.id,
			alias: 'teamMemberInvitation_acceptedById_user_id'
		}),
		conference: r.one.conference({
			from: r.teamMemberInvitation.conferenceId,
			to: r.conference.id
		}),
		userInvitedById: r.one.user({
			from: r.teamMemberInvitation.invitedById,
			to: r.user.id,
			alias: 'teamMemberInvitation_invitedById_user_id'
		})
	},
	paymentTransaction: {
		users: r.many.user({
			from: r.paymentTransaction.id.through(
				r.userReferenceInPaymentTransaction.paymentTransactionId
			),
			to: r.user.id.through(r.userReferenceInPaymentTransaction.userId)
		})
	}
}));
