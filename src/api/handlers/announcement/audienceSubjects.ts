import { db } from '#api/db/db';
import type * as schema from '#api/db/schema/index';
import { ofAgeAtConference } from '#lib/helpers/ageChecker';
import getSimplifiedPostalStatus from '#lib/helpers/getSimplifiedPostalStatus';
import {
	inAudience,
	type Audience,
	type AudiencePart,
	type AudienceSubject
} from '#lib/helpers/announcements';

/**
 * The people of a conference as the announcements' audiences see them (`AudienceSubject`): every
 * participant, everybody waiting and the team. One loader for the feed (one person), the
 * recipient counts and the mails, so they agree on who an announcement is for.
 */

type Status = (typeof schema.administrativeStatus.enumValues)[number];

/** A person an announcement can reach, with who they are to the mails. */
export interface AudiencePerson {
	userId: string;
	/** Their participant row, for a participant. */
	participantId: string | null;
	/** Their membership, for somebody on the team. */
	teamMemberId: string | null;
	subject: AudienceSubject;
}

/** A participant row as the subjects are built from it. */
export interface ParticipantFacts {
	id: string;
	userId: string;
	birthday: Date | null;
	paymentStatus: Status;
	termsAndConditions: Status;
	guardianConsent: Status;
	mediaConsent: Status;
	delegation: { roleId: string | null; committeeId: string | null } | null;
	single: { roleId: string | null } | null;
	/** Whether a supervisor comes along themselves, and whether any of their students holds a seat. */
	supervisor: { plansOwnAttendance: boolean; studentSeated: boolean } | null;
	surveyOptionIds: readonly string[];
}

const seatOf = (person: ParticipantFacts) => person.delegation?.roleId ?? person.single?.roleId;

type Conference = { assignmentReleased: boolean; startConference: Date };

/** How a participant row takes part; `undefined` for one that outlived its registration. */
function partOf(person: ParticipantFacts) {
	if (person.delegation) return 'DELEGATE' as const;
	if (person.single) return 'SINGLE' as const;
	if (person.supervisor) return 'SUPERVISOR' as const;
	return undefined;
}

/** Whether the person's paperwork is in, with the guardian's consent for a minor. */
const postalDone = ({ person, ofAge }: { person: ParticipantFacts; ofAge: boolean }) =>
	getSimplifiedPostalStatus({
		participantStatus: {
			termsAndConditions: person.termsAndConditions,
			guardianConsent: person.guardianConsent,
			mediaConsent: person.mediaConsent
		},
		ofAge
	}) === 'DONE';

const WITHOUT_SEAT = { seated: false, roleId: null, committeeId: null } as const;

/** A supervisor who comes to the conference themselves, with a student who holds a seat. */
function comesAlong({ supervisor }: ParticipantFacts) {
	return !!supervisor && supervisor.plansOwnAttendance && supervisor.studentSeated;
}

/** What the audiences ask about a seat, all empty until the assignment is released. */
function seatFacts({ person, released }: { person: ParticipantFacts; released: boolean }) {
	if (!released) return WITHOUT_SEAT;
	const roleId = seatOf(person);
	if (!roleId) return { ...WITHOUT_SEAT, seated: comesAlong(person) };
	return { seated: true, roleId, committeeId: person.delegation?.committeeId ?? null };
}

function subjectOf({
	person,
	part,
	conference
}: {
	person: ParticipantFacts;
	part: NonNullable<ReturnType<typeof partOf>>;
	conference: Conference;
}): AudienceSubject {
	const ofAge = person.birthday
		? ofAgeAtConference({
				startConference: conference.startConference,
				dateOfBirth: person.birthday
			})
		: null;
	const seat = seatFacts({ person, released: conference.assignmentReleased });
	return {
		part,
		...seat,
		surveyOptionIds: person.surveyOptionIds,
		paymentOpen: seat.seated && person.paymentStatus !== 'DONE',
		paperworkOpen: seat.seated && !postalDone({ person, ofAge: ofAge ?? false }),
		ofAge,
		teamRoles: []
	};
}

/**
 * The subjects of a conference's participants. Before the assignment is released nobody holds a
 * seat as far as the audiences are concerned.
 */
export function participantSubjects({
	participants,
	conference
}: {
	participants: readonly ParticipantFacts[];
	conference: Conference;
}): AudiencePerson[] {
	return participants.flatMap((person) => {
		const part = partOf(person);
		return part
			? [
					{
						userId: person.userId,
						participantId: person.id,
						teamMemberId: null,
						subject: subjectOf({ person, part, conference })
					}
				]
			: [];
	});
}

/** A participant row as it is loaded, for `participantFacts`. */
export interface ParticipantRow {
	id: string;
	userId: string;
	paymentStatus: Status;
	termsAndConditions: Status;
	guardianConsent: Status;
	mediaConsent: Status;
	user: { birthday: Date | null };
	delegationMember: {
		assignedCommitteeId: string | null;
		delegation: { assignedRoleId: string | null };
	} | null;
	singleParticipant: { assignedRoleId: string | null } | null;
	conferenceSupervisor: {
		plansOwnAttendenceAtConference: boolean;
		supervised: {
			delegationMember: { delegation: { assignedRoleId: string | null } } | null;
			singleParticipant: { assignedRoleId: string | null } | null;
		}[];
	} | null;
}

const holdsSeat = (
	student: NonNullable<ParticipantRow['conferenceSupervisor']>['supervised'][number]
) =>
	!!student.delegationMember?.delegation.assignedRoleId ||
	!!student.singleParticipant?.assignedRoleId;

/** The row as the subjects are built from it, with the survey options the person picked. */
export function participantFacts({
	row,
	surveyOptionIds
}: {
	row: ParticipantRow;
	surveyOptionIds: readonly string[];
}): ParticipantFacts {
	const { delegationMember: member, singleParticipant: single, conferenceSupervisor } = row;
	return {
		id: row.id,
		userId: row.userId,
		birthday: row.user.birthday,
		paymentStatus: row.paymentStatus,
		termsAndConditions: row.termsAndConditions,
		guardianConsent: row.guardianConsent,
		mediaConsent: row.mediaConsent,
		delegation: member && {
			roleId: member.delegation.assignedRoleId,
			committeeId: member.assignedCommitteeId
		},
		single: single && { roleId: single.assignedRoleId },
		supervisor: conferenceSupervisor && {
			plansOwnAttendance: conferenceSupervisor.plansOwnAttendenceAtConference,
			studentSeated: conferenceSupervisor.supervised.some(holdsSeat)
		},
		surveyOptionIds
	};
}

const NO_SEAT = {
	seated: false,
	committeeId: null,
	roleId: null,
	surveyOptionIds: [],
	paymentOpen: false,
	paperworkOpen: false
} as const;

/**
 * Everybody the conference's announcements can reach; with `userId` only that person. Undefined
 * for a conference that does not exist.
 */
export async function loadAudiencePeople({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId?: string;
}): Promise<AudiencePerson[] | undefined> {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { assignmentReleased: true, startConference: true }
	});
	if (!conference) return undefined;
	const own = userId ? { userId } : {};

	const [participants, answers, waiting, team] = await Promise.all([
		db.query.conferenceParticipant.findMany({
			where: { conferenceId, ...own },
			columns: {
				id: true,
				userId: true,
				paymentStatus: true,
				termsAndConditions: true,
				guardianConsent: true,
				mediaConsent: true
			},
			with: {
				user: { columns: { birthday: true } },
				delegationMember: {
					columns: { assignedCommitteeId: true },
					with: { delegation: { columns: { assignedRoleId: true } } }
				},
				singleParticipant: { columns: { assignedRoleId: true } },
				conferenceSupervisor: {
					columns: { plansOwnAttendenceAtConference: true },
					// a supervisor who comes along is seated once one of their students is
					with: {
						supervised: {
							columns: { id: true },
							with: {
								delegationMember: {
									columns: { id: true },
									with: { delegation: { columns: { assignedRoleId: true } } }
								},
								singleParticipant: { columns: { assignedRoleId: true } }
							}
						}
					}
				}
			}
		}),
		db.query.surveyAnswer.findMany({
			where: { question: { conferenceId }, ...(userId ? { user: { id: userId } } : {}) },
			columns: { conferenceParticipantId: true, optionId: true }
		}),
		db.query.waitingListEntry.findMany({
			where: { conferenceId, assignedAt: { isNull: true }, ...own },
			columns: { userId: true },
			with: { user: { columns: { birthday: true } } }
		}),
		db.query.teamMember.findMany({
			where: { conferenceId, ...own },
			columns: { id: true, userId: true, role: true }
		})
	]);

	const optionsOf = Map.groupBy(answers, (answer) => answer.conferenceParticipantId);
	const people = participantSubjects({
		conference,
		participants: participants.map((row) =>
			participantFacts({
				row,
				surveyOptionIds: (optionsOf.get(row.id) ?? []).map((answer) => answer.optionId)
			})
		)
	});

	// somebody with a registration is a participant, whatever the waiting list still says
	const registered = new Set(people.map((person) => person.userId));
	const teamByUser = Map.groupBy(team, (member) => member.userId);
	return [
		...people,
		...waiting
			.filter((entry) => !registered.has(entry.userId))
			.map((entry) => ({
				userId: entry.userId,
				participantId: null,
				teamMemberId: null,
				subject: {
					...NO_SEAT,
					part: 'WAITING_LIST' as const,
					ofAge: entry.user.birthday
						? ofAgeAtConference({
								startConference: conference.startConference,
								dateOfBirth: entry.user.birthday
							})
						: null,
					teamRoles: []
				}
			})),
		...[...teamByUser].map(([memberUserId, memberships]) => ({
			userId: memberUserId,
			participantId: null,
			teamMemberId: memberships[0].id,
			subject: {
				...NO_SEAT,
				part: 'TEAM' as const,
				ofAge: null,
				teamRoles: memberships.map((membership) => membership.role)
			}
		}))
	];
}

/** How many people an audience reaches, by how they take part. */
export interface AudienceCounts {
	total: number;
	delegates: number;
	singleParticipants: number;
	supervisors: number;
	waitingList: number;
	team: number;
}

const COUNTED_AS: Record<AudiencePart, Exclude<keyof AudienceCounts, 'total'>> = {
	DELEGATE: 'delegates',
	SINGLE: 'singleParticipants',
	SUPERVISOR: 'supervisors',
	WAITING_LIST: 'waitingList',
	TEAM: 'team'
};

/** Counts the people of `people` the audiences reach, each person once. */
export function countAudience({
	people,
	audiences: given
}: {
	people: readonly AudiencePerson[];
	audiences: readonly Audience[];
}): AudienceCounts {
	const counts: AudienceCounts = {
		total: 0,
		delegates: 0,
		singleParticipants: 0,
		supervisors: 0,
		waitingList: 0,
		team: 0
	};
	const seen = new Set<string>();
	for (const { userId, subject } of people) {
		if (seen.has(userId) || !inAudience({ subject, audiences: given })) continue;
		seen.add(userId);
		counts.total++;
		counts[COUNTED_AS[subject.part]]++;
	}
	return counts;
}
