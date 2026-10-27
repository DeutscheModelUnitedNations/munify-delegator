import { db } from '#api/db/db.js';
import type {
	EmailSnapshot,
	SnapshotPerson,
	SnapshotReview,
	SnapshotRole,
	SnapshotSurvey
} from './dueEmails';

const ROLE = { columns: { id: true, kind: true, name: true, nationAlpha3Code: true } } as const;

/** Everything `dueEmails` decides from, for one conference; `undefined` if it does not exist. */
export async function loadEmailSnapshot(conferenceId: string): Promise<EmailSnapshot | undefined> {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: {
			id: true,
			title: true,
			state: true,
			assignmentReleased: true,
			unlockPostals: true,
			unlockPayments: true,
			startAssignment: true,
			startConference: true,
			timezone: true,
			certificateFileId: true
		}
	});
	if (!conference) return undefined;

	const [participants, seatedEntries, reviews, surveys] = await Promise.all([
		db.query.conferenceParticipant.findMany({
			where: { conferenceId },
			columns: {
				id: true,
				paymentStatus: true,
				termsAndConditions: true,
				guardianConsent: true,
				mediaConsent: true,
				didAttend: true
			},
			with: {
				user: {
					columns: {
						id: true,
						email: true,
						givenName: true,
						familyName: true,
						locale: true,
						birthday: true
					}
				},
				delegationMember: {
					columns: { id: true },
					with: {
						delegation: {
							columns: { applied: true },
							with: { assignedRole: ROLE }
						},
						assignedCommittee: { columns: { abbreviation: true } }
					}
				},
				singleParticipant: {
					columns: { applied: true },
					with: { assignedRole: ROLE }
				},
				conferenceSupervisor: {
					columns: { plansOwnAttendenceAtConference: true },
					with: { supervised: { columns: { id: true } } }
				}
			}
		}),
		db.query.waitingListEntry.findMany({
			where: { conferenceId, assigned: true },
			columns: { id: true, userId: true }
		}),
		db.query.paperReview.findMany({
			where: { paperVersion: { paper: { delegation: { conferenceId } } } },
			columns: { id: true, statusAfter: true },
			with: {
				reviewer: { columns: { givenName: true, familyName: true, email: true } },
				paperVersion: {
					columns: { id: true },
					with: {
						paper: {
							columns: { id: true, type: true, authorParticipantId: true },
							with: {
								agendaItem: {
									columns: { title: true },
									with: { committee: { columns: { abbreviation: true } } }
								}
							}
						}
					}
				}
			}
		}),
		// What participants see: neither drafts nor the questions the team hid
		db.query.surveyQuestion.findMany({
			where: { conferenceId, draft: false, hidden: false },
			columns: { id: true, title: true, deadline: true },
			with: { surveyAnswers: { columns: { conferenceParticipantId: true } } }
		})
	]);

	const seatedFrom = new Map(seatedEntries.map((entry) => [entry.userId, entry.id]));

	const people = participants.flatMap((participant): SnapshotPerson[] => {
		const user = participant.user;
		if (!user) return [];
		const entryId = seatedFrom.get(user.id);
		return [
			{
				participantId: participant.id,
				user,
				paymentStatus: participant.paymentStatus,
				termsAndConditions: participant.termsAndConditions,
				guardianConsent: participant.guardianConsent,
				mediaConsent: participant.mediaConsent,
				didAttend: participant.didAttend,
				delegation: delegationPart(participant.delegationMember),
				single: singlePart(participant.singleParticipant),
				supervisor: supervisorPart(participant.conferenceSupervisor),
				seatedFromWaitingList: entryId ? { entryId } : null
			}
		];
	});

	return {
		conference: {
			id: conference.id,
			title: conference.title,
			state: conference.state,
			assignmentReleased: conference.assignmentReleased,
			unlockPostals: conference.unlockPostals,
			unlockPayments: conference.unlockPayments,
			startAssignment: conference.startAssignment,
			startConference: conference.startConference,
			timezone: conference.timezone,
			certificateAvailable: !!conference.certificateFileId
		},
		people,
		reviews: reviews.flatMap(reviewPart),
		surveys: surveys.map((survey): SnapshotSurvey => ({
			id: survey.id,
			title: survey.title,
			deadline: survey.deadline,
			answeredBy: survey.surveyAnswers.map((answer) => answer.conferenceParticipantId)
		}))
	};
}

/** A review as the mails read it; none for a paper without an author to tell. */
export function reviewPart(review: {
	id: string;
	statusAfter: SnapshotReview['statusAfter'];
	reviewer: { givenName: string; familyName: string; email: string } | null;
	paperVersion: {
		paper: {
			id: string;
			type: SnapshotReview['paperType'];
			authorParticipantId: string | null;
			agendaItem: { title: string; committee: { abbreviation: string } | null } | null;
		} | null;
	} | null;
}): SnapshotReview[] {
	const paper = review.paperVersion?.paper;
	if (!paper?.authorParticipantId) return [];
	const committee = paper.agendaItem?.committee;
	return [
		{
			id: review.id,
			authorParticipantId: paper.authorParticipantId,
			paperId: paper.id,
			paperType: paper.type,
			agendaItem:
				committee && paper.agendaItem
					? `${committee.abbreviation}: ${paper.agendaItem.title}`
					: null,
			reviewer: review.reviewer
				? {
						name: `${review.reviewer.givenName} ${review.reviewer.familyName}`,
						email: review.reviewer.email
					}
				: null,
			statusAfter: review.statusAfter
		}
	];
}

type Role = SnapshotRole | null | undefined;

/** A participant's delegation membership, as the mails read it; `null` outside a delegation. */
export function delegationPart(
	member:
		| {
				delegation: { applied: boolean; assignedRole?: Role } | null;
				assignedCommittee?: { abbreviation: string } | null;
		  }
		| null
		| undefined
): SnapshotPerson['delegation'] {
	if (!member?.delegation) return null;
	return {
		applied: member.delegation.applied,
		role: member.delegation.assignedRole ?? null,
		committee: member.assignedCommittee?.abbreviation ?? null
	};
}

function singlePart(
	single: { applied: boolean; assignedRole?: Role } | null | undefined
): SnapshotPerson['single'] {
	return single ? { applied: single.applied, role: single.assignedRole ?? null } : null;
}

function supervisorPart(
	supervisor:
		{ plansOwnAttendenceAtConference: boolean; supervised: { id: string }[] } | null | undefined
): SnapshotPerson['supervisor'] {
	return supervisor
		? {
				plansOwnAttendance: supervisor.plansOwnAttendenceAtConference,
				studentIds: supervisor.supervised.map((student) => student.id)
			}
		: null;
}
