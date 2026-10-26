import { db } from '#api/db/db.js';
import type { EmailSnapshot, SnapshotPerson, SnapshotRole } from './dueEmails';

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
			certificateFileId: true
		}
	});
	if (!conference) return undefined;

	const [participants, seatedEntries] = await Promise.all([
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
			certificateAvailable: !!conference.certificateFileId
		},
		people
	};
}

type Role = SnapshotRole | null | undefined;

function delegationPart(
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
