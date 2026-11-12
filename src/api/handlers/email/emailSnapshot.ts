import type { SQL } from 'drizzle-orm';
import { db, type schema } from '#api/db/db';
import { participantCandidates, teamCandidates, waitingListCandidates } from './emailCandidates';
import { linkConfig } from '#api/handlers/chaseLink/linkAuth';
import type {
	EmailKind,
	EmailSnapshot,
	SnapshotPerson,
	SnapshotReview,
	SnapshotRole,
	SnapshotSurvey,
	SnapshotTeamMember,
	SnapshotWaitingEntry
} from './dueEmails';
import { loadUnreadOfParticipants, loadUnreadOfTeam } from './unreadMessages';

/**
 * What `dueEmails` decides from, read a page at a time: never a whole conference at once. A page
 * is one of three parts - participants, the waiting list, the team - and holds, besides its own
 * rows, only what the rules about them read: the people around them (`neighbours`: co-members,
 * supervisors, students), the reviews of their papers and their survey answers. Parts and data
 * the asked-for kinds do not need are not read at all.
 */

/** Participants per page; the waiting list and the team page by the same size. */
const EMAIL_PAGE_SIZE = 500;

type EmailPagePart = 'people' | 'waitingList' | 'team';
/** Where a page starts: the part, and the last id before it. */
export interface EmailCursor {
	part: EmailPagePart;
	after: string | null;
}
const PARTS: readonly EmailPagePart[] = ['people', 'waitingList', 'team'];
export const FIRST_EMAIL_PAGE: EmailCursor = { part: 'people', after: null };

/** The kinds only one part makes due; every other kind is about participants. */
const PARTS_OF_KIND: Partial<Record<EmailKind, readonly EmailPagePart[]>> = {
	WAITING_LIST_REGISTERED: ['waitingList'],
	TEAM_WELCOME: ['team'],
	// chats are read by participants and by the team's inboxes
	UNREAD_MESSAGES: ['people', 'team']
};
const PEOPLE_ONLY: readonly EmailPagePart[] = ['people'];
export const partsFor = (kinds: ReadonlySet<EmailKind>) =>
	new Set([...kinds].flatMap((kind) => PARTS_OF_KIND[kind] ?? PEOPLE_ONLY));
/** Whether the page has to read who has not read their chats. */
const needsUnread = ({
	conference,
	kinds
}: {
	conference: EmailConference;
	kinds: ReadonlySet<EmailKind>;
}) => conference.messagingEnabled && kinds.has('UNREAD_MESSAGES');
const needsReviews = (kinds: ReadonlySet<EmailKind>) => kinds.has('PAPER_REVIEWED');
const needsSurveys = (kinds: ReadonlySet<EmailKind>) =>
	kinds.has('SURVEY_PUBLISHED') || kinds.has('SURVEY_REMINDER');

const ROLE = {
	columns: { id: true, kind: true, name: true, nationAlpha3Code: true }
} as const;
const USER = {
	columns: {
		id: true,
		email: true,
		givenName: true,
		familyName: true,
		locale: true,
		birthday: true
	}
} as const;

export type EmailConference = EmailSnapshot['conference'];

/** The conference as the mails read it; `undefined` if it does not exist. */
export async function loadEmailConference(
	conferenceId: string
): Promise<EmailConference | undefined> {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: {
			id: true,
			title: true,
			state: true,
			assignmentReleased: true,
			unlockPostals: true,
			unlockPayments: true,
			applicationDeadline: true,
			startConference: true,
			timezone: true,
			certificateFileId: true,
			messagingEnabled: true
		}
	});
	if (!conference) return undefined;
	const { certificateFileId, ...rest } = conference;
	return {
		...rest,
		certificateAvailable: !!certificateFileId,
		chaseUrl: linkConfig()?.remoteUrl ?? null
	};
}

const emptySnapshot = (conference: EmailConference): EmailSnapshot => ({
	conference,
	people: [],
	neighbours: [],
	team: [],
	reviews: [],
	surveys: [],
	waitingList: [],
	unreadMessages: []
});

const PARTICIPANT_COLUMNS = {
	id: true,
	paymentStatus: true,
	termsAndConditions: true,
	guardianConsent: true,
	mediaConsent: true,
	didAttend: true
} as const;

/**
 * A page of the conference's participants (after `after`), or those of one user, with whatever
 * the rules read about them and who is around them.
 */
function loadParticipants({
	conferenceId,
	after,
	userId,
	limit,
	candidates
}: {
	conferenceId: string;
	after?: string | null;
	userId?: string;
	limit?: number;
	/** Only the rows that may be owed a mail (`emailCandidates.ts`). */
	candidates?: (row: typeof schema.conferenceParticipant) => SQL;
}) {
	return db.query.conferenceParticipant.findMany({
		where: {
			conferenceId,
			...(after ? { id: { gt: after } } : {}),
			...(userId ? { userId } : {}),
			...(candidates ? { RAW: candidates } : {})
		},
		columns: PARTICIPANT_COLUMNS,
		with: {
			user: USER,
			delegationMember: {
				columns: { id: true, isHeadDelegate: true, createdAt: true },
				with: {
					delegation: {
						columns: { id: true, entryCode: true, applied: true },
						with: {
							assignedRole: ROLE,
							members: { columns: { conferenceParticipantId: true } }
						}
					},
					assignedCommittee: { columns: { id: true, abbreviation: true } }
				}
			},
			singleParticipant: {
				columns: { applied: true },
				with: { assignedRole: ROLE }
			},
			conferenceSupervisor: {
				columns: { plansOwnAttendenceAtConference: true },
				with: { supervised: { columns: { id: true } } }
			},
			supervisors: { columns: { conferenceParticipantId: true } }
		},
		orderBy: { id: 'asc' },
		...(limit ? { limit } : {})
	});
}

/** The neighbours with these ids, slim: without the people around them in turn. */
function loadNeighbours({ conferenceId, ids }: { conferenceId: string; ids: string[] }) {
	return db.query.conferenceParticipant.findMany({
		where: { conferenceId, id: { in: ids } },
		columns: PARTICIPANT_COLUMNS,
		with: {
			user: USER,
			delegationMember: {
				columns: { id: true, isHeadDelegate: true, createdAt: true },
				with: {
					delegation: {
						columns: { id: true, entryCode: true, applied: true },
						with: { assignedRole: ROLE }
					},
					assignedCommittee: { columns: { id: true, abbreviation: true } }
				}
			},
			singleParticipant: {
				columns: { applied: true },
				with: { assignedRole: ROLE }
			},
			conferenceSupervisor: { columns: { plansOwnAttendenceAtConference: true } }
		}
	});
}

type LoadedParticipant = Awaited<ReturnType<typeof loadParticipants>>[number];
type NeighbourRow = Awaited<ReturnType<typeof loadNeighbours>>[number];
/** What `toPeople` reads: a page's participant, or a slim neighbour without their links. */
type PersonRow = NeighbourRow & {
	conferenceSupervisor:
		(NonNullable<NeighbourRow['conferenceSupervisor']> & { supervised?: { id: string }[] }) | null;
	supervisors?: { conferenceParticipantId: string }[];
};

/**
 * Which people around the page the asked-for kinds read about. Students always (a supervisor's
 * summary, the mails about linking, and whether a supervisor comes along all count them); the
 * co-members only for `DELEGATION_MEMBER_JOINED`, which is about delegations still put together
 * during registration; the supervisors only for `SUPERVISOR_CONNECTED`. Co-members are most of
 * the people around a page, so the others would read them for nothing.
 */
function neighbourWants({
	conference,
	kinds
}: {
	conference: EmailConference;
	kinds: ReadonlySet<EmailKind>;
}) {
	return {
		coMembers:
			kinds.has('DELEGATION_MEMBER_JOINED') && conference.state === 'PARTICIPANT_REGISTRATION',
		supervisors: kinds.has('SUPERVISOR_CONNECTED')
	};
}

/** The people a participant's rules read about, as far as `wants` asks for them. */
function neighbourIds({
	participant,
	wants
}: {
	participant: LoadedParticipant;
	wants: ReturnType<typeof neighbourWants>;
}) {
	const delegation = participant.delegationMember?.delegation;
	return [
		...(wants.coMembers && delegation && !delegation.applied ? delegation.members : []).map(
			(member) => member.conferenceParticipantId
		),
		...(participant.conferenceSupervisor?.supervised ?? []).map((student) => student.id),
		...(wants.supervisors ? participant.supervisors : []).map(
			(supervisor) => supervisor.conferenceParticipantId
		)
	];
}

/** Turns loaded participants into people, with the waiting list entry each was seated from. */
async function toPeople({
	conferenceId,
	participants
}: {
	conferenceId: string;
	participants: PersonRow[];
}) {
	const userIds = participants.flatMap((participant) =>
		participant.user ? [participant.user.id] : []
	);
	const seatedEntries =
		userIds.length > 0
			? await db.query.waitingListEntry.findMany({
					where: { conferenceId, assignedAt: { isNotNull: true }, userId: { in: userIds } },
					columns: { id: true, userId: true }
				})
			: [];
	const seatedFrom = new Map(seatedEntries.map((entry) => [entry.userId, entry.id]));
	return participants.flatMap((participant): SnapshotPerson[] => {
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
				seatedFromWaitingList: entryId ? { entryId } : null,
				supervisorIds: (participant.supervisors ?? []).map(
					(supervisor) => supervisor.conferenceParticipantId
				)
			}
		];
	});
}

/** The reviews of papers the participants wrote. */
async function loadReviews(participantIds: string[]) {
	const reviews = await db.query.paperReview.findMany({
		where: { paperVersion: { paper: { authorParticipantId: { in: participantIds } } } },
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
	});
	return reviews.flatMap(reviewPart);
}

/** The published surveys, with which of the participants answered them. */
async function loadSurveys({
	conferenceId,
	participantIds
}: {
	conferenceId: string;
	participantIds: string[];
}) {
	// What participants see: neither drafts nor the questions the team hid
	const surveys = await db.query.surveyQuestion.findMany({
		where: { conferenceId, draft: false, hidden: false },
		columns: { id: true, title: true, deadline: true },
		with: {
			surveyAnswers: {
				where: { conferenceParticipantId: { in: participantIds } },
				columns: { conferenceParticipantId: true }
			}
		}
	});
	return surveys.map((survey): SnapshotSurvey => ({
		id: survey.id,
		title: survey.title,
		deadline: survey.deadline,
		answeredBy: survey.surveyAnswers.map((answer) => answer.conferenceParticipantId)
	}));
}

/** A snapshot of `participants` and the people, reviews and answers their rules read. */
async function peopleSnapshot({
	conference,
	participants,
	kinds
}: {
	conference: EmailConference;
	participants: LoadedParticipant[];
	kinds: ReadonlySet<EmailKind>;
}): Promise<EmailSnapshot> {
	const own = new Set(participants.map((participant) => participant.id));
	const wants = neighbourWants({ conference, kinds });
	const aroundIds = [
		...new Set(participants.flatMap((participant) => neighbourIds({ participant, wants })))
	].filter((id) => !own.has(id));
	const conferenceId = conference.id;
	const participantIds = [...own];
	const [around, reviews, surveys, unreadMessages] = await Promise.all([
		aroundIds.length > 0 ? loadNeighbours({ conferenceId, ids: aroundIds }) : [],
		needsReviews(kinds) && participantIds.length > 0 ? loadReviews(participantIds) : [],
		needsSurveys(kinds) && participantIds.length > 0
			? loadSurveys({ conferenceId, participantIds })
			: [],
		needsUnread({ conference, kinds })
			? loadUnreadOfParticipants({ conferenceId, participantIds })
			: []
	]);
	const [people, neighbours] = await Promise.all([
		toPeople({ conferenceId, participants }),
		toPeople({ conferenceId, participants: around })
	]);
	return { ...emptySnapshot(conference), people, neighbours, reviews, surveys, unreadMessages };
}

function loadWaitingList({
	conferenceId,
	after,
	userId,
	limit,
	onlyCandidates = false
}: {
	conferenceId: string;
	after?: string | null;
	userId?: string;
	limit?: number;
	/** Only the entries not yet told they wait. */
	onlyCandidates?: boolean;
}) {
	return db.query.waitingListEntry.findMany({
		where: {
			conferenceId,
			assignedAt: { isNull: true },
			...(after ? { id: { gt: after } } : {}),
			...(userId ? { userId } : {}),
			...(onlyCandidates
				? {
						RAW: (row: typeof schema.waitingListEntry) =>
							waitingListCandidates({ conferenceId, id: row.id, userId: row.userId })
					}
				: {})
		},
		columns: { id: true },
		with: { user: USER },
		orderBy: { id: 'asc' },
		...(limit ? { limit } : {})
	});
}

const toWaitingList = (entries: Awaited<ReturnType<typeof loadWaitingList>>) =>
	entries.flatMap((entry): SnapshotWaitingEntry[] =>
		entry.user ? [{ id: entry.id, user: entry.user }] : []
	);

async function loadTeam({
	conferenceId,
	after,
	userId,
	limit,
	candidates
}: {
	conferenceId: string;
	after?: string | null;
	userId?: string;
	limit?: number;
	/** Only the members who may be owed a mail (`teamCandidates`). */
	candidates?: (row: typeof schema.teamMember) => SQL;
}) {
	const members = await db.query.teamMember.findMany({
		where: {
			conferenceId,
			...(after ? { id: { gt: after } } : {}),
			...(userId ? { userId } : {}),
			...(candidates ? { RAW: candidates } : {})
		},
		columns: { id: true, role: true },
		with: { user: USER },
		orderBy: { id: 'asc' },
		...(limit ? { limit } : {})
	});
	const userIds = members.flatMap((member) => (member.user ? [member.user.id] : []));
	// Oldest first, so the latest invitation a member accepted names their inviter
	const accepted =
		userIds.length > 0
			? await db.query.teamMemberInvitation.findMany({
					where: { conferenceId, acceptedById: { in: userIds } },
					columns: { acceptedById: true },
					with: { invitedBy: { columns: { givenName: true, familyName: true } } },
					orderBy: { createdAt: 'asc' }
				})
			: [];
	const inviterOf = new Map(
		accepted.map((invitation) => [
			invitation.acceptedById,
			invitation.invitedBy
				? `${invitation.invitedBy.givenName} ${invitation.invitedBy.familyName}`
				: null
		])
	);
	return {
		rows: members,
		team: members.flatMap((member): SnapshotTeamMember[] =>
			member.user
				? [
						{
							id: member.id,
							role: member.role,
							user: member.user,
							inviterName: inviterOf.get(member.user.id) ?? null
						}
					]
				: []
		)
	};
}

/** What the inboxes these team members answer have not read. */
function teamUnread({
	conference,
	kinds,
	team
}: {
	conference: EmailConference;
	kinds: ReadonlySet<EmailKind>;
	team: readonly SnapshotTeamMember[];
}) {
	return needsUnread({ conference, kinds })
		? loadUnreadOfTeam({
				conferenceId: conference.id,
				teamMemberIds: team.map((member) => member.id)
			})
		: [];
}

/** The cursor after a page of `rows`: the same part on, or the next part once it ran out. */
export function nextCursor({
	cursor,
	rows,
	size,
	parts
}: {
	cursor: EmailCursor;
	rows: readonly { id: string }[];
	size: number;
	parts: ReadonlySet<EmailPagePart>;
}): EmailCursor | null {
	const last = rows.at(-1);
	if (rows.length >= size && last) return { part: cursor.part, after: last.id };
	const following = PARTS.slice(PARTS.indexOf(cursor.part) + 1).find((part) => parts.has(part));
	return following ? { part: following, after: null } : null;
}

/**
 * One page of what the conference may owe at `now`, from `cursor` on, with the cursor of the next
 * (`null` after the last). Parts the kinds do not need are skipped, and so is every row the log
 * shows owed nothing (`emailCandidates.ts`): a page holds only rows that may be owed a mail.
 */
async function loadEmailPage({
	conference,
	cursor,
	kinds,
	now,
	size = EMAIL_PAGE_SIZE
}: {
	conference: EmailConference;
	cursor: EmailCursor;
	kinds: ReadonlySet<EmailKind>;
	now: Date;
	size?: number;
}): Promise<{ snapshot: EmailSnapshot; next: EmailCursor | null }> {
	const parts = partsFor(kinds);
	if (!parts.has(cursor.part)) {
		const next = nextCursor({ cursor, rows: [], size, parts });
		return { snapshot: emptySnapshot(conference), next };
	}
	const conferenceId = conference.id;
	const { after } = cursor;
	if (cursor.part === 'people') {
		const participants = await loadParticipants({
			conferenceId,
			after,
			limit: size,
			candidates: (row) => participantCandidates({ conference, kinds, now, row })
		});
		return {
			snapshot: await peopleSnapshot({ conference, participants, kinds }),
			next: nextCursor({ cursor, rows: participants, size, parts })
		};
	}
	if (cursor.part === 'waitingList') {
		const entries = await loadWaitingList({
			conferenceId,
			after,
			limit: size,
			onlyCandidates: true
		});
		return {
			snapshot: { ...emptySnapshot(conference), waitingList: toWaitingList(entries) },
			next: nextCursor({ cursor, rows: entries, size, parts })
		};
	}
	const { rows, team } = await loadTeam({
		conferenceId,
		after,
		limit: size,
		candidates: (row) => teamCandidates({ conference, kinds, id: row.id, userId: row.userId })
	});
	return {
		snapshot: {
			...emptySnapshot(conference),
			team,
			unreadMessages: await teamUnread({ conference, kinds, team })
		},
		next: nextCursor({ cursor, rows, size, parts })
	};
}

/** Every page of the conference from `from` on, each with its own cursor and the next one's. */
export async function* emailPages({
	conference,
	kinds,
	now,
	from = FIRST_EMAIL_PAGE
}: {
	conference: EmailConference;
	kinds: ReadonlySet<EmailKind>;
	now: Date;
	from?: EmailCursor;
}) {
	let cursor: EmailCursor | null = from;
	while (cursor) {
		const page = await loadEmailPage({ conference, cursor, kinds, now });
		yield { ...page, cursor };
		cursor = page.next;
	}
}

/** Everything one user is owed in the conference: their part in it, waiting or on the team. */
export async function loadUserSnapshot({
	conference,
	userId,
	kinds
}: {
	conference: EmailConference;
	userId: string;
	kinds: ReadonlySet<EmailKind>;
}): Promise<EmailSnapshot> {
	const conferenceId = conference.id;
	const [participants, entries, { team }] = await Promise.all([
		loadParticipants({ conferenceId, userId }),
		loadWaitingList({ conferenceId, userId }),
		loadTeam({ conferenceId, userId })
	]);
	const [people, unreadOfTeam] = await Promise.all([
		peopleSnapshot({ conference, participants, kinds }),
		teamUnread({ conference, kinds, team })
	]);
	return {
		...people,
		waitingList: toWaitingList(entries),
		team,
		unreadMessages: [...people.unreadMessages, ...unreadOfTeam]
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
				isHeadDelegate: boolean;
				createdAt: Date;
				delegation: {
					id: string;
					entryCode: string;
					applied: boolean;
					assignedRole?: Role;
				} | null;
				assignedCommittee?: { id: string; abbreviation: string } | null;
		  }
		| null
		| undefined
): SnapshotPerson['delegation'] {
	if (!member?.delegation) return null;
	return {
		id: member.delegation.id,
		entryCode: member.delegation.entryCode,
		isHeadDelegate: member.isHeadDelegate,
		joinedAt: member.createdAt,
		applied: member.delegation.applied,
		role: member.delegation.assignedRole ?? null,
		committee: member.assignedCommittee?.abbreviation ?? null,
		committeeId: member.assignedCommittee?.id ?? null
	};
}

function singlePart(
	single: { applied: boolean; assignedRole?: Role } | null | undefined
): SnapshotPerson['single'] {
	return single ? { applied: single.applied, role: single.assignedRole ?? null } : null;
}

function supervisorPart(
	supervisor:
		{ plansOwnAttendenceAtConference: boolean; supervised?: { id: string }[] } | null | undefined
): SnapshotPerson['supervisor'] {
	return supervisor
		? {
				plansOwnAttendance: supervisor.plansOwnAttendenceAtConference,
				studentIds: (supervisor.supervised ?? []).map((student) => student.id)
			}
		: null;
}
