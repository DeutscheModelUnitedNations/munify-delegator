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
	assignmentReview: {
		conference: r.one.conference({
			from: r.assignmentReview.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		delegation: r.one.delegation({
			from: r.assignmentReview.delegationId,
			to: r.delegation.id
		}),
		singleParticipant: r.one.singleParticipant({
			from: r.assignmentReview.singleParticipantId,
			to: r.singleParticipant.id
		})
	},
	assignmentSingleRole: {
		singleParticipant: r.one.singleParticipant({
			from: r.assignmentSingleRole.singleParticipantId,
			to: r.singleParticipant.id,
			optional: false
		}),
		role: r.one.conferenceRole({
			from: r.assignmentSingleRole.roleId,
			to: r.conferenceRole.id
		})
	},
	assignmentUnit: {
		conference: r.one.conference({
			from: r.assignmentUnit.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		sourceDelegation: r.one.delegation({
			from: r.assignmentUnit.sourceDelegationId,
			to: r.delegation.id
		}),
		sourceSingleParticipant: r.one.singleParticipant({
			from: r.assignmentUnit.sourceSingleParticipantId,
			to: r.singleParticipant.id
		}),
		role: r.one.conferenceRole({
			from: r.assignmentUnit.roleId,
			to: r.conferenceRole.id
		}),
		members: r.many.assignmentUnitMember({
			from: r.assignmentUnit.id,
			to: r.assignmentUnitMember.unitId
		})
	},
	assignmentUnitMember: {
		conference: r.one.conference({
			from: r.assignmentUnitMember.unitId.through(r.assignmentUnit.id),
			to: r.conference.id.through(r.assignmentUnit.conferenceId),
			optional: false
		}),
		unit: r.one.assignmentUnit({
			from: r.assignmentUnitMember.unitId,
			to: r.assignmentUnit.id,
			optional: false
		}),
		delegationMember: r.one.delegationMember({
			from: r.assignmentUnitMember.delegationMemberId,
			to: r.delegationMember.id,
			optional: false
		})
	},
	assignmentWeights: {
		conference: r.one.conference({
			from: r.assignmentWeights.conferenceId,
			to: r.conference.id,
			optional: false
		})
	},
	attendanceEntry: {
		conferenceParticipant: r.one.conferenceParticipant({
			from: r.attendanceEntry.conferenceParticipantId,
			to: r.conferenceParticipant.id,
			optional: false
		}),
		recordedBy: r.one.user({
			from: r.attendanceEntry.recordedById,
			to: r.user.id,
			optional: false
		}),
		session: r.one.attendanceSession({
			from: r.attendanceEntry.sessionId,
			to: r.attendanceSession.id,
			optional: false
		})
	},
	attendanceSession: {
		conference: r.one.conference({
			from: r.attendanceSession.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		createdBy: r.one.user({
			from: r.attendanceSession.createdById,
			to: r.user.id,
			optional: false
		}),
		entries: r.many.attendanceEntry({
			from: r.attendanceSession.id,
			to: r.attendanceEntry.sessionId
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
		tracks: r.many.calendarTrack({
			from: r.calendarEntry.id.through(r.calendarEntryToCalendarTrack.a),
			to: r.calendarTrack.id.through(r.calendarEntryToCalendarTrack.b)
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
			from: r.calendarTrack.id.through(r.calendarEntryToCalendarTrack.b),
			to: r.calendarEntry.id.through(r.calendarEntryToCalendarTrack.a)
		})
	},
	committee: {
		agendaItems: r.many.committeeAgendaItem({
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
		// the nation roles the committee seats
		roles: r.many.conferenceRole({
			from: r.committee.id.through(r.committeeToRole.a),
			to: r.conferenceRole.id.through(r.committeeToRole.b)
		}),
		resolutions: r.many.resolution({
			from: r.committee.id,
			to: r.resolution.committeeId
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
		imageFile: r.one.storedFile({
			from: r.conference.imageFileId,
			to: r.storedFile.id
		}),
		emblemFile: r.one.storedFile({
			from: r.conference.emblemFileId,
			to: r.storedFile.id
		}),
		logoFile: r.one.storedFile({
			from: r.conference.logoFileId,
			to: r.storedFile.id
		}),
		contractFile: r.one.storedFile({
			from: r.conference.contractFileId,
			to: r.storedFile.id
		}),
		guardianConsentFile: r.one.storedFile({
			from: r.conference.guardianConsentFileId,
			to: r.storedFile.id
		}),
		mediaConsentFile: r.one.storedFile({
			from: r.conference.mediaConsentFileId,
			to: r.storedFile.id
		}),
		termsAndConditionsFile: r.one.storedFile({
			from: r.conference.termsAndConditionsFileId,
			to: r.storedFile.id
		}),
		certificateFile: r.one.storedFile({
			from: r.conference.certificateFileId,
			to: r.storedFile.id
		}),
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
			from: r.conference.id.through(r.conferenceParticipant.conferenceId),
			to: r.conferenceSupervisor.conferenceParticipantId.through(r.conferenceParticipant.id)
		}),
		conferenceParticipants: r.many.conferenceParticipant({
			from: r.conference.id,
			to: r.conferenceParticipant.conferenceId
		}),
		delegationMembers: r.many.delegationMember({
			from: r.conference.id.through(r.conferenceParticipant.conferenceId),
			to: r.delegationMember.conferenceParticipantId.through(r.conferenceParticipant.id)
		}),
		delegations: r.many.delegation({
			from: r.conference.id,
			to: r.delegation.conferenceId
		}),
		roles: r.many.conferenceRole({
			from: r.conference.id,
			to: r.conferenceRole.conferenceId
		}),
		papers: r.many.paper({
			from: r.conference.id.through(r.delegation.conferenceId),
			to: r.paper.delegationId.through(r.delegation.id)
		}),
		paymentTransactions: r.many.paymentTransaction({
			from: r.conference.id.through(r.conferenceParticipant.conferenceId),
			to: r.paymentTransaction.payerParticipantId.through(r.conferenceParticipant.id)
		}),
		places: r.many.place({
			from: r.conference.id,
			to: r.place.conferenceId
		}),
		resolutions: r.many.resolution({
			from: r.conference.id,
			to: r.resolution.conferenceId
		}),
		singleParticipants: r.many.singleParticipant({
			from: r.conference.id.through(r.conferenceParticipant.conferenceId),
			to: r.singleParticipant.conferenceParticipantId.through(r.conferenceParticipant.id)
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
	conferenceParticipant: {
		attendanceEntries: r.many.attendanceEntry({
			from: r.conferenceParticipant.id,
			to: r.attendanceEntry.conferenceParticipantId
		}),
		conference: r.one.conference({
			from: r.conferenceParticipant.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		user: r.one.user({
			from: r.conferenceParticipant.userId,
			to: r.user.id,
			optional: false
		}),
		// who supervises the person
		supervisors: r.many.conferenceSupervisor({
			from: r.conferenceParticipant.id.through(r.supervision.b),
			to: r.conferenceSupervisor.id.through(r.supervision.a)
		}),
		delegationMember: r.one.delegationMember({
			from: r.conferenceParticipant.id,
			to: r.delegationMember.conferenceParticipantId
		}),
		singleParticipant: r.one.singleParticipant({
			from: r.conferenceParticipant.id,
			to: r.singleParticipant.conferenceParticipantId
		}),
		// the person as a supervisor themselves
		conferenceSupervisor: r.one.conferenceSupervisor({
			from: r.conferenceParticipant.id,
			to: r.conferenceSupervisor.conferenceParticipantId
		})
	},
	conferenceSupervisor: {
		conference: r.one.conference({
			from: r.conferenceSupervisor.conferenceParticipantId.through(r.conferenceParticipant.id),
			to: r.conference.id.through(r.conferenceParticipant.conferenceId),
			optional: false
		}),
		school: r.one.school({
			from: r.conferenceSupervisor.schoolId,
			to: r.school.id
		}),
		// Supervision links people (`conferenceParticipant`); these two read it as the registrations
		// the supervised people hold, which is what most of the app wants to show.
		supervised: r.many.conferenceParticipant({
			from: r.conferenceSupervisor.id.through(r.supervision.a),
			to: r.conferenceParticipant.id.through(r.supervision.b)
		}),
		supervisedDelegationMembers: r.many.delegationMember({
			from: r.conferenceSupervisor.id.through(r.supervision.a),
			to: r.delegationMember.conferenceParticipantId.through(r.supervision.b)
		}),
		supervisedSingleParticipants: r.many.singleParticipant({
			from: r.conferenceSupervisor.id.through(r.supervision.a),
			to: r.singleParticipant.conferenceParticipantId.through(r.supervision.b)
		}),
		participant: r.one.conferenceParticipant({
			from: r.conferenceSupervisor.conferenceParticipantId,
			to: r.conferenceParticipant.id,
			optional: false
		}),
		user: r.one.user({
			from: r.conferenceSupervisor.conferenceParticipantId.through(r.conferenceParticipant.id),
			to: r.user.id.through(r.conferenceParticipant.userId),
			optional: false
		})
	},
	conferenceRole: {
		conference: r.one.conference({
			from: r.conferenceRole.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		nation: r.one.nation({
			from: r.conferenceRole.nationAlpha3Code,
			to: r.nation.alpha3Code
		}),
		committees: r.many.committee({
			from: r.conferenceRole.id.through(r.committeeToRole.b),
			to: r.committee.id.through(r.committeeToRole.a)
		}),
		assignedDelegations: r.many.delegation({
			from: r.conferenceRole.id,
			to: r.delegation.assignedRoleId
		}),
		assignedSingleParticipants: r.many.singleParticipant({
			from: r.conferenceRole.id,
			to: r.singleParticipant.assignedRoleId
		}),
		roleApplications: r.many.roleApplication({
			from: r.conferenceRole.id,
			to: r.roleApplication.roleId
		}),
		appliedSingleParticipants: r.many.singleParticipant({
			from: r.conferenceRole.id.through(r.singleParticipantRoleWish.a),
			to: r.singleParticipant.id.through(r.singleParticipantRoleWish.b)
		})
	},
	delegation: {
		appliedForRoles: r.many.roleApplication({
			from: r.delegation.id,
			to: r.roleApplication.delegationId
		}),
		school: r.one.school({
			from: r.delegation.schoolId,
			to: r.school.id
		}),
		assignedRole: r.one.conferenceRole({
			from: r.delegation.assignedRoleId,
			to: r.conferenceRole.id
		}),
		// The team's review of the application, so lists of delegations can filter by it.
		assignmentReview: r.one.assignmentReview({
			from: r.delegation.id,
			to: r.assignmentReview.delegationId
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
			from: r.delegationMember.conferenceParticipantId.through(r.conferenceParticipant.id),
			to: r.conference.id.through(r.conferenceParticipant.conferenceId),
			optional: false
		}),
		delegation: r.one.delegation({
			from: r.delegationMember.delegationId,
			to: r.delegation.id,
			optional: false
		}),
		participant: r.one.conferenceParticipant({
			from: r.delegationMember.conferenceParticipantId,
			to: r.conferenceParticipant.id,
			optional: false
		}),
		// the person's supervisors, through their `conferenceParticipant`
		supervisors: r.many.conferenceSupervisor({
			from: r.delegationMember.conferenceParticipantId.through(r.supervision.b),
			to: r.conferenceSupervisor.id.through(r.supervision.a)
		}),
		user: r.one.user({
			from: r.delegationMember.conferenceParticipantId.through(r.conferenceParticipant.id),
			to: r.user.id.through(r.conferenceParticipant.userId),
			optional: false
		})
	},
	nation: {
		conferenceRoles: r.many.conferenceRole({
			from: r.nation.alpha3Code,
			to: r.conferenceRole.nationAlpha3Code
		})
	},
	paper: {
		authorParticipant: r.one.conferenceParticipant({
			from: r.paper.authorParticipantId,
			to: r.conferenceParticipant.id,
			optional: false
		}),
		agendaItem: r.one.committeeAgendaItem({
			from: r.paper.agendaItemId,
			to: r.committeeAgendaItem.id
		}),
		author: r.one.user({
			from: r.paper.authorParticipantId.through(r.conferenceParticipant.id),
			to: r.user.id.through(r.conferenceParticipant.userId),
			optional: false
		}),
		conference: r.one.conference({
			from: r.paper.delegationId.through(r.delegation.id),
			to: r.conference.id.through(r.delegation.conferenceId),
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
		payer: r.one.conferenceParticipant({
			from: r.paymentTransaction.payerParticipantId,
			to: r.conferenceParticipant.id,
			optional: false
		}),
		conference: r.one.conference({
			from: r.paymentTransaction.payerParticipantId.through(r.conferenceParticipant.id),
			to: r.conference.id.through(r.conferenceParticipant.conferenceId),
			optional: false
		}),
		paymentFor: r.many.userReferenceInPaymentTransaction({
			from: r.paymentTransaction.id,
			to: r.userReferenceInPaymentTransaction.paymentTransactionId
		}),
		user: r.one.user({
			from: r.paymentTransaction.payerParticipantId.through(r.conferenceParticipant.id),
			to: r.user.id.through(r.conferenceParticipant.userId),
			optional: false
		})
	},
	place: {
		sitePlanFile: r.one.storedFile({
			from: r.place.sitePlanFileId,
			to: r.storedFile.id
		}),
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
	resolution: {
		file: r.one.storedFile({
			from: r.resolution.fileId,
			to: r.storedFile.id,
			optional: false
		}),
		conference: r.one.conference({
			from: r.resolution.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		committee: r.one.committee({
			from: r.resolution.committeeId,
			to: r.committee.id
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
		role: r.one.conferenceRole({
			from: r.roleApplication.roleId,
			to: r.conferenceRole.id,
			optional: false
		})
	},
	singleParticipant: {
		appliedForRoles: r.many.conferenceRole({
			from: r.singleParticipant.id.through(r.singleParticipantRoleWish.b),
			to: r.conferenceRole.id.through(r.singleParticipantRoleWish.a)
		}),
		school: r.one.school({
			from: r.singleParticipant.schoolId,
			to: r.school.id
		}),
		// The team's review of the application, so the board can read it along with the participant.
		assignmentReview: r.one.assignmentReview({
			from: r.singleParticipant.id,
			to: r.assignmentReview.singleParticipantId
		}),
		assignedRole: r.one.conferenceRole({
			from: r.singleParticipant.assignedRoleId,
			to: r.conferenceRole.id
		}),
		conference: r.one.conference({
			from: r.singleParticipant.conferenceParticipantId.through(r.conferenceParticipant.id),
			to: r.conference.id.through(r.conferenceParticipant.conferenceId),
			optional: false
		}),
		participant: r.one.conferenceParticipant({
			from: r.singleParticipant.conferenceParticipantId,
			to: r.conferenceParticipant.id,
			optional: false
		}),
		// the person's supervisors, through their `conferenceParticipant`
		supervisors: r.many.conferenceSupervisor({
			from: r.singleParticipant.conferenceParticipantId.through(r.supervision.b),
			to: r.conferenceSupervisor.id.through(r.supervision.a)
		}),
		user: r.one.user({
			from: r.singleParticipant.conferenceParticipantId.through(r.conferenceParticipant.id),
			to: r.user.id.through(r.conferenceParticipant.userId),
			optional: false
		})
	},
	surveyAnswer: {
		participant: r.one.conferenceParticipant({
			from: r.surveyAnswer.conferenceParticipantId,
			to: r.conferenceParticipant.id,
			optional: false
		}),
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
			from: r.surveyAnswer.conferenceParticipantId.through(r.conferenceParticipant.id),
			to: r.user.id.through(r.conferenceParticipant.userId),
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
	schoolSuggestion: {
		conference: r.one.conference({
			from: r.schoolSuggestion.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		variants: r.many.schoolSuggestionVariant({
			from: r.schoolSuggestion.id,
			to: r.schoolSuggestionVariant.suggestionId
		})
	},
	schoolSuggestionVariant: {
		suggestion: r.one.schoolSuggestion({
			from: r.schoolSuggestionVariant.suggestionId,
			to: r.schoolSuggestion.id,
			optional: false
		}),
		school: r.one.school({
			from: r.schoolSuggestionVariant.schoolId,
			to: r.school.id,
			optional: false
		})
	},
	school: {
		delegations: r.many.delegation({
			from: r.school.id,
			to: r.delegation.schoolId
		}),
		singleParticipants: r.many.singleParticipant({
			from: r.school.id,
			to: r.singleParticipant.schoolId
		}),
		conferenceSupervisors: r.many.conferenceSupervisor({
			from: r.school.id,
			to: r.conferenceSupervisor.schoolId
		}),
		waitingListEntries: r.many.waitingListEntry({
			from: r.school.id,
			to: r.waitingListEntry.schoolId
		})
	},
	possibleDuplicate: {
		user: r.one.user({
			from: r.possibleDuplicate.userId,
			to: r.user.id,
			optional: false,
			alias: 'possibleDuplicateUser'
		}),
		candidate: r.one.user({
			from: r.possibleDuplicate.candidateId,
			to: r.user.id,
			optional: false,
			alias: 'possibleDuplicateCandidate'
		}),
		decidedBy: r.one.user({
			from: r.possibleDuplicate.decidedById,
			to: r.user.id,
			alias: 'possibleDuplicateDecidedBy'
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
		/** pairs where this account is the smaller id; see `possibleDuplicate` */
		duplicatesAsUser: r.many.possibleDuplicate({
			from: r.user.id,
			to: r.possibleDuplicate.userId,
			alias: 'possibleDuplicateUser'
		}),
		duplicatesAsCandidate: r.many.possibleDuplicate({
			from: r.user.id,
			to: r.possibleDuplicate.candidateId,
			alias: 'possibleDuplicateCandidate'
		}),
		duplicateDecisions: r.many.possibleDuplicate({
			from: r.user.id,
			to: r.possibleDuplicate.decidedById,
			alias: 'possibleDuplicateDecidedBy'
		}),
		conferenceParticipants: r.many.conferenceParticipant({
			from: r.user.id,
			to: r.conferenceParticipant.userId
		}),
		conferenceSupervisor: r.many.conferenceSupervisor({
			from: r.user.id.through(r.conferenceParticipant.userId),
			to: r.conferenceSupervisor.conferenceParticipantId.through(r.conferenceParticipant.id)
		}),
		delegationMemberships: r.many.delegationMember({
			from: r.user.id.through(r.conferenceParticipant.userId),
			to: r.delegationMember.conferenceParticipantId.through(r.conferenceParticipant.id)
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
			from: r.user.id.through(r.conferenceParticipant.userId),
			to: r.paymentTransaction.payerParticipantId.through(r.conferenceParticipant.id)
		}),
		paperReviews: r.many.paperReview({
			from: r.user.id,
			to: r.paperReview.reviewerId
		}),
		papers: r.many.paper({
			from: r.user.id.through(r.conferenceParticipant.userId),
			to: r.paper.authorParticipantId.through(r.conferenceParticipant.id)
		}),
		paymentTransactionsReferences: r.many.userReferenceInPaymentTransaction({
			from: r.user.id.through(r.conferenceParticipant.userId),
			to: r.userReferenceInPaymentTransaction.conferenceParticipantId.through(
				r.conferenceParticipant.id
			)
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
			from: r.user.id.through(r.conferenceParticipant.userId),
			to: r.singleParticipant.conferenceParticipantId.through(r.conferenceParticipant.id)
		}),
		surveyAnswers: r.many.surveyAnswer({
			from: r.user.id.through(r.conferenceParticipant.userId),
			to: r.surveyAnswer.conferenceParticipantId.through(r.conferenceParticipant.id)
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
		participant: r.one.conferenceParticipant({
			from: r.userReferenceInPaymentTransaction.conferenceParticipantId,
			to: r.conferenceParticipant.id,
			optional: false
		}),
		paymentTransaction: r.one.paymentTransaction({
			from: r.userReferenceInPaymentTransaction.paymentTransactionId,
			to: r.paymentTransaction.id,
			optional: false
		}),
		user: r.one.user({
			from: r.userReferenceInPaymentTransaction.conferenceParticipantId.through(
				r.conferenceParticipant.id
			),
			to: r.user.id.through(r.conferenceParticipant.userId),
			optional: false
		})
	},
	conferenceEmailSetting: {
		conference: r.one.conference({
			from: r.conferenceEmailSetting.conferenceId,
			to: r.conference.id,
			optional: false
		})
	},
	emailLog: {
		conference: r.one.conference({
			from: r.emailLog.conferenceId,
			to: r.conference.id,
			optional: false
		}),
		user: r.one.user({
			from: r.emailLog.userId,
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
		school: r.one.school({
			from: r.waitingListEntry.schoolId,
			to: r.school.id
		}),
		user: r.one.user({
			from: r.waitingListEntry.userId,
			to: r.user.id,
			optional: false
		})
	}
}));
