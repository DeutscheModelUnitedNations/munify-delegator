/**
 * What the rules know about the caller: their team roles, their own registrations and the people
 * they share a delegation or a supervision with, loaded with a handful of small queries and kept
 * for the request (`callerFacts`). The rules (`rules.ts`, the `*Permissions.ts`) turn these into
 * filters on a table's own columns - `{ id: { in: ids } }`, `{ conferenceId: { in: ids } }` -
 * instead of chains of relations: rumble would look a relational rule up once per table and root
 * field, in one statement holding every such rule as nested `exists`, and planning those cost
 * Postgres hundreds of megabytes (the user table's held 101).
 *
 * The facts follow the request the way rumble's resolved rules do: they are loaded again when a
 * root field starts (`RefreshCallerFactsPlugin`) and when a resolver says so after a write
 * (`refreshCallerAbilities`). rumble evaluates a rule once per request, so the rules read the facts
 * when a query is built rather than when they are evaluated (`liveRule`).
 */
import { sql } from 'drizzle-orm';
import { refreshAbilities } from '@m1212e/rumble';
import { db } from '#api/db/db';
import { teamRole } from '#api/db/schema/index';
import type { Context } from '#api/context';
import type { ApiContext } from '#api/rumble';
import { PAPER_ROLES, PARTICIPANT_CARE_ROLES } from '#lib/helpers/teamRoles';
import { callerUserId } from './utils';

type TeamRole = (typeof teamRole.enumValues)[number];
type DuplicateStatus = 'OPEN' | 'CONFIRMED' | 'DISMISSED';

/** What the rules need to know of a conference the caller has a part in. */
export type ConferenceFlags = { assignmentReleased: boolean; showCalendar: boolean };

export type CallerFacts = {
	/**
	 * The conferences the session's user is on the team of, with their roles there. For an AI
	 * assistant (`ctx.mcp`) only the conference of the tool call, and only while it has switched MCP
	 * on; a system admin holds every role there.
	 */
	team: readonly { conferenceId: string; roles: readonly TeamRole[] }[];
	/** Who is on the team of each of those conferences, the caller included. */
	teammates: readonly { conferenceId: string; userId: string }[];
	/**
	 * The caller's own part in each conference (`conferenceParticipant`); `registered` while they
	 * are a delegate, single participant or supervisor there (the row outlives the registration).
	 * Empty for an AI assistant (`callerUserId`).
	 */
	participants: readonly { id: string; conferenceId: string; registered: boolean }[];
	/** The caller's delegation memberships; `applied` is the delegation's. */
	delegationMemberships: readonly {
		id: string;
		delegationId: string;
		conferenceId: string;
		isHeadDelegate: boolean;
		applied: boolean;
	}[];
	/** The caller's single participant registrations. */
	singleParticipations: readonly { id: string; conferenceId: string; applied: boolean }[];
	/** The caller's supervisor registrations. */
	supervisorRegistrations: readonly { id: string; conferenceId: string }[];
	/** Every member of the caller's delegations, the caller included. */
	delegationMates: readonly {
		memberId: string;
		participantId: string;
		userId: string;
		delegationId: string;
	}[];
	/** Who supervises the caller where they are a delegate or single participant. */
	ownSupervisors: readonly { supervisorId: string; userId: string }[];
	/** The people the caller supervises, with the registration each holds, if any. */
	supervised: readonly {
		participantId: string;
		userId: string;
		conferenceId: string;
		delegationMemberId: string | null;
		delegationId: string | null;
		singleParticipantId: string | null;
	}[];
	/** The supervisors of the delegates and single participants the caller supervises. */
	coSupervisors: readonly { supervisorId: string; userId: string }[];
	/** The caller's papers, with their versions and who reviewed them. */
	authoredPapers: readonly {
		id: string;
		versionIds: readonly string[];
		reviewerIds: readonly string[];
	}[];
	/** The flags of every conference named above. */
	conferences: ReadonlyMap<string, ConferenceFlags>;
	/** The conferences open for registration or, from the assignment on, for the waiting list. */
	publicConferenceIds: readonly string[];
	/** The authors of the papers of the conferences where the caller holds a paper role. */
	paperTeamAuthorUserIds: readonly string[];
	/**
	 * The other account of each possible duplicate pair with an account in the caller's care
	 * (`isCaredForUser`), with the pair's status. Empty unless the caller is participant care.
	 */
	careDuplicates: readonly { userId: string; status: DuplicateStatus }[];
};

/** The facts of nobody: an anonymous caller's, and the start of everyone else's. */
export const NO_CALLER_FACTS: CallerFacts = {
	team: [],
	teammates: [],
	participants: [],
	delegationMemberships: [],
	singleParticipations: [],
	supervisorRegistrations: [],
	delegationMates: [],
	ownSupervisors: [],
	supervised: [],
	coSupervisors: [],
	authoredPapers: [],
	conferences: new Map(),
	publicConferenceIds: [],
	paperTeamAuthorUserIds: [],
	careDuplicates: []
};

/** Who the facts are about: the team rules and the participant rules know the caller differently. */
export type FactsSubject = {
	/** The session's user, whom the team rules go by (an assistant's request included). */
	teamUserId: string | undefined;
	/** `callerUserId`: undefined for an AI assistant, whose own registrations count nowhere. */
	participantUserId: string | undefined;
	mcp: { conferenceId: string; isAdmin: boolean } | undefined;
	/**
	 * A system admin (never over MCP): every team rule matches every row for them already, so what
	 * only those rules read (the papers' authors, the care team's duplicates) is not looked up.
	 */
	systemAdmin?: boolean;
};

function factsSubject(ctx: Context): FactsSubject {
	return {
		teamUserId: ctx.oidc.user?.sub,
		participantUserId: callerUserId(ctx),
		mcp: ctx.mcp,
		systemAdmin: !ctx.mcp && ctx.hasRole('admin')
	};
}

const CONFERENCE_FLAGS = { assignmentReleased: true, showCalendar: true } as const;

/** The caller's team memberships, with the flags and the teams of those conferences. */
async function loadTeam({ teamUserId, mcp }: FactsSubject) {
	if (!teamUserId) return [];
	if (mcp?.isAdmin) {
		// an admin's assistant holds every role in the conference of its tool call
		const conference = await db.query.conference.findFirst({
			where: { id: mcp.conferenceId, mcpEnabled: true },
			columns: { id: true, ...CONFERENCE_FLAGS },
			with: { teamMembers: { columns: { userId: true } } }
		});
		return conference
			? [{ conferenceId: conference.id, roles: [...teamRole.enumValues], conference }]
			: [];
	}
	const memberships = await db.query.teamMember.findMany({
		where: mcp ? { userId: teamUserId, conferenceId: mcp.conferenceId } : { userId: teamUserId },
		columns: { conferenceId: true, role: true },
		with: {
			conference: {
				columns: { mcpEnabled: true, ...CONFERENCE_FLAGS },
				with: { teamMembers: { columns: { userId: true } } }
			}
		}
	});
	return memberships
		.filter((membership) => !mcp || membership.conference.mcpEnabled)
		.map(({ conferenceId, role, conference }) => ({ conferenceId, roles: [role], conference }));
}

/** The caller's parts in conferences, with their registrations and delegation mates. */
function queryParticipation(userId: string) {
	return db.query.conferenceParticipant.findMany({
		where: { userId },
		columns: { id: true, conferenceId: true },
		with: {
			conference: { columns: CONFERENCE_FLAGS },
			delegationMember: {
				columns: { id: true, delegationId: true, isHeadDelegate: true },
				with: {
					delegation: {
						columns: { applied: true },
						with: {
							members: {
								columns: { id: true, conferenceParticipantId: true },
								with: { participant: { columns: { userId: true } } }
							}
						}
					}
				}
			},
			singleParticipant: { columns: { id: true, applied: true } },
			conferenceSupervisor: { columns: { id: true } },
			supervisors: {
				columns: { id: true },
				with: { participant: { columns: { userId: true } } }
			}
		}
	});
}

export type ParticipationRows = Awaited<ReturnType<typeof queryParticipation>>;

async function loadParticipation(userId: string | undefined): Promise<ParticipationRows> {
	return userId ? queryParticipation(userId) : [];
}

/** The people the caller's supervisor registrations supervise, and their other supervisors. */
function querySupervision(supervisorIds: readonly string[]) {
	return db.query.conferenceSupervisor.findMany({
		where: { id: { in: [...supervisorIds] } },
		columns: { id: true },
		with: {
			supervised: {
				columns: { id: true, userId: true, conferenceId: true },
				with: {
					delegationMember: { columns: { id: true, delegationId: true } },
					singleParticipant: { columns: { id: true } },
					supervisors: {
						columns: { id: true },
						with: { participant: { columns: { userId: true } } }
					}
				}
			}
		}
	});
}

export type SupervisionRows = Awaited<ReturnType<typeof querySupervision>>;

async function loadSupervision(supervisorIds: readonly string[]): Promise<SupervisionRows> {
	return supervisorIds.length === 0 ? [] : querySupervision(supervisorIds);
}

/** The papers the caller wrote, with their versions and reviewers. */
function queryAuthoredPapers(participantIds: readonly string[]) {
	return db.query.paper.findMany({
		where: { authorParticipantId: { in: [...participantIds] } },
		columns: { id: true },
		with: {
			versions: { columns: { id: true }, with: { reviews: { columns: { reviewerId: true } } } }
		}
	});
}

async function loadAuthoredPapers(
	participantIds: readonly string[]
): Promise<Awaited<ReturnType<typeof queryAuthoredPapers>>> {
	return participantIds.length === 0 ? [] : queryAuthoredPapers(participantIds);
}

async function loadPublicConferenceIds() {
	const conferences = await db.query.conference.findMany({
		where: { state: { in: ['PARTICIPANT_REGISTRATION', 'PREPARATION'] } },
		columns: { id: true }
	});
	return conferences.map((conference) => conference.id);
}

/** The authors of the papers of `conferenceIds`. */
async function loadPaperAuthors(conferenceIds: readonly string[]) {
	if (conferenceIds.length === 0) return [];
	const papers = await db.query.paper.findMany({
		where: { delegation: { conferenceId: { in: [...conferenceIds] } } },
		columns: {},
		with: { authorParticipant: { columns: { userId: true } } }
	});
	return unique(papers.map((paper) => paper.authorParticipant.userId));
}

/**
 * The other account of the possible duplicate pairs with an account in the care of participant
 * care of `conferenceIds` (`isCaredForUser`): a registered participant or a waiting list entrant.
 */
async function loadCareDuplicates(conferenceIds: readonly string[]) {
	if (conferenceIds.length === 0) return [];
	const conference = { conferenceId: { in: [...conferenceIds] } };
	const caredFor = {
		OR: [
			{
				conferenceParticipants: {
					...conference,
					OR: [
						{ delegationMember: true },
						{ singleParticipant: true },
						{ conferenceSupervisor: true }
					]
				}
			},
			{ waitingListEntry: conference }
		]
	};
	const [candidateCaredFor, userCaredFor] = await Promise.all([
		db.query.possibleDuplicate.findMany({
			where: { candidate: caredFor },
			columns: { userId: true, status: true }
		}),
		db.query.possibleDuplicate.findMany({
			where: { user: caredFor },
			columns: { candidateId: true, status: true }
		})
	]);
	return [
		...candidateCaredFor,
		...userCaredFor.map(({ candidateId, status }) => ({ userId: candidateId, status }))
	];
}

function unique<T>(values: readonly T[]) {
	return [...new Set(values)];
}

/** The team facts from the memberships, merging the roles held per conference. */
export function teamFacts(memberships: Awaited<ReturnType<typeof loadTeam>>) {
	const roles = new Map<string, TeamRole[]>();
	const conferences = new Map<string, ConferenceFlags>();
	const teammates = new Map<string, { conferenceId: string; userId: string }>();
	for (const { conferenceId, roles: held, conference } of memberships) {
		roles.set(conferenceId, unique([...(roles.get(conferenceId) ?? []), ...held]));
		conferences.set(conferenceId, {
			assignmentReleased: conference.assignmentReleased,
			showCalendar: conference.showCalendar
		});
		for (const { userId } of conference.teamMembers) {
			teammates.set(`${conferenceId}/${userId}`, { conferenceId, userId });
		}
	}
	return {
		team: [...roles].map(([conferenceId, held]) => ({ conferenceId, roles: held })),
		teammates: [...teammates.values()],
		conferences
	};
}

/** The participation facts from the caller's participant rows and the supervision they hold. */
export function participationFacts({
	participation,
	supervision
}: {
	participation: ParticipationRows;
	supervision: SupervisionRows;
}) {
	const conferences = new Map<string, ConferenceFlags>(
		participation.map((row) => [row.conferenceId, row.conference])
	);
	const delegationMemberships = participation.flatMap(({ conferenceId, delegationMember }) =>
		delegationMember
			? [
					{
						id: delegationMember.id,
						delegationId: delegationMember.delegationId,
						conferenceId,
						isHeadDelegate: delegationMember.isHeadDelegate,
						applied: delegationMember.delegation.applied
					}
				]
			: []
	);
	const supervisorConference = new Map(
		participation.flatMap(({ conferenceId, conferenceSupervisor }) =>
			conferenceSupervisor ? [[conferenceSupervisor.id, conferenceId] as const] : []
		)
	);
	const supervised = supervision.flatMap((supervisor) => supervisor.supervised);
	const registeredSupervised = supervised.filter(
		(person) => person.delegationMember || person.singleParticipant
	);
	return {
		conferences,
		participants: participation.map(
			({ id, conferenceId, delegationMember, singleParticipant, conferenceSupervisor }) => ({
				id,
				conferenceId,
				registered: !!(delegationMember || singleParticipant || conferenceSupervisor)
			})
		),
		delegationMemberships,
		singleParticipations: participation.flatMap(({ conferenceId, singleParticipant }) =>
			singleParticipant
				? [{ id: singleParticipant.id, conferenceId, applied: singleParticipant.applied }]
				: []
		),
		supervisorRegistrations: [...supervisorConference].map(([id, conferenceId]) => ({
			id,
			conferenceId
		})),
		delegationMates: participation.flatMap(({ delegationMember }) => {
			if (!delegationMember) return [];
			const { delegationId, delegation } = delegationMember;
			return delegation.members.map((member) => ({
				memberId: member.id,
				participantId: member.conferenceParticipantId,
				userId: member.participant.userId,
				delegationId
			}));
		}),
		// supervision counts where the caller holds a registration a supervisor can look after
		ownSupervisors: participation
			.filter((row) => row.delegationMember || row.singleParticipant)
			.flatMap((row) =>
				row.supervisors.map((supervisor) => ({
					supervisorId: supervisor.id,
					userId: supervisor.participant.userId
				}))
			),
		supervised: supervised.map((person) => ({
			participantId: person.id,
			userId: person.userId,
			conferenceId: person.conferenceId,
			delegationMemberId: person.delegationMember?.id ?? null,
			delegationId: person.delegationMember?.delegationId ?? null,
			singleParticipantId: person.singleParticipant?.id ?? null
		})),
		coSupervisors: registeredSupervised.flatMap((person) =>
			person.supervisors.map((supervisor) => ({
				supervisorId: supervisor.id,
				userId: supervisor.participant.userId
			}))
		)
	};
}

/** The ids of the conferences in which the caller holds one of `roles` (any role without). */
export function teamConferenceIdsIn({
	facts,
	roles
}: {
	facts: Pick<CallerFacts, 'team'>;
	roles?: readonly TeamRole[];
}) {
	return facts.team
		.filter((membership) => !roles || membership.roles.some((role) => roles.includes(role)))
		.map((membership) => membership.conferenceId);
}

/** Loads the facts about `subject` (a few queries in two rounds). */
export async function loadCallerFacts(subject: FactsSubject): Promise<CallerFacts> {
	const userId = subject.participantUserId;
	const [memberships, participation, publicConferenceIds] = await Promise.all([
		loadTeam(subject),
		loadParticipation(userId),
		loadPublicConferenceIds()
	]);
	const team = teamFacts(memberships);
	const supervisorIds = participation.flatMap((row) =>
		row.conferenceSupervisor ? [row.conferenceSupervisor.id] : []
	);
	const [supervision, papers, paperTeamAuthorUserIds, careDuplicates] = await Promise.all([
		loadSupervision(supervisorIds),
		loadAuthoredPapers(participation.map((row) => row.id)),
		loadPaperAuthors(
			subject.systemAdmin ? [] : teamConferenceIdsIn({ facts: team, roles: PAPER_ROLES })
		),
		loadCareDuplicates(
			subject.systemAdmin ? [] : teamConferenceIdsIn({ facts: team, roles: PARTICIPANT_CARE_ROLES })
		)
	]);
	const parts = participationFacts({ participation, supervision });
	return {
		...parts,
		team: team.team,
		teammates: team.teammates,
		// a conference the caller is on the team of and takes part in has the same flags either way
		conferences: new Map([...parts.conferences, ...team.conferences]),
		authoredPapers: papers.map((paper) => ({
			id: paper.id,
			versionIds: paper.versions.map((version) => version.id),
			reviewerIds: unique(
				paper.versions.flatMap((version) => version.reviews.map((review) => review.reviewerId))
			)
		})),
		publicConferenceIds,
		paperTeamAuthorUserIds,
		careDuplicates
	};
}

/** Starts loading the caller's facts, keeping them once loaded unless a later load overtook it. */
function startLoad(ctx: Context) {
	const cache = ctx.callerFactsCache;
	const load = ++cache.loads;
	const loading = loadCallerFacts(factsSubject(ctx)).then(
		(facts) => {
			// the latest load wins; an earlier one that finishes first still fills an empty cache,
			// so a rule that awaited it never finds no facts while the later one is on its way
			if (load === cache.loads || !cache.current) cache.current = facts;
			return facts;
		},
		(error: unknown) => {
			// a failed load is not kept: the next caller tries again
			if (cache.loading === loading) cache.loading = undefined;
			throw error;
		}
	);
	cache.loading = loading;
	return loading;
}

/** The caller's facts, loaded once per root field (and again after `refreshCallerFacts`). */
export function callerFacts(ctx: Context): Promise<CallerFacts> {
	return ctx.callerFactsCache.loading ?? startLoad(ctx);
}

/**
 * The facts the last finished load found, for code that runs while a query is built and cannot
 * wait (`liveRule`). Only valid once `callerFacts` has been awaited in the request.
 */
export function currentCallerFacts(ctx: Context): CallerFacts {
	const facts = ctx.callerFactsCache.current;
	if (!facts) throw new Error('currentCallerFacts: the facts were not loaded yet');
	return facts;
}

/**
 * Loads the caller's facts again if this request has loaded them before: when a root field
 * starts, and after a write that changes what the caller has a part in. A request that has not
 * needed them yet loads them when it does.
 */
export async function refreshCallerFacts(ctx: Context) {
	if (!ctx.callerFactsCache.loading) return;
	await startLoad(ctx);
}

/**
 * After a write that changes what the caller has a part in (a registration, a delegation), before
 * reading through the abilities in the same resolver: loads the caller's facts again and starts a
 * new snapshot of rumble's resolved rules, both of which were taken when the root field started.
 */
export async function refreshCallerAbilities(ctx: ApiContext) {
	await refreshCallerFacts(ctx);
	refreshAbilities(ctx.abilities);
}

/** A rule's filter and, optionally, the columns it lets the caller read. */
type Grant<W extends object, C extends object> = { where: W; columns?: C };

/** A filter matching no row, for a rule whose facts no longer grant anything. */
const NO_ROW = { RAW: sql`false` };

/**
 * For `.when(liveRule(({ ctx, facts }) => ...))`: a rule built from the caller's facts. rumble
 * evaluates a rule once per request and keeps what it returned, so the rule answers with a filter
 * that is built again from the facts as they are whenever rumble prepares the table's filter (at
 * every root field, `RefreshCallerFactsPlugin`). Whether the rule grants anything at all and which
 * columns it lets through must therefore depend on the context only (signed in or not, a system
 * admin, an AI assistant), never on the facts: a filter on an empty id list matches nothing, it
 * does not drop the rule. Should the facts later make `derive` answer undefined, the rule matches
 * nothing.
 */
export function liveRule<W extends object, C extends object>(
	derive: (args: { ctx: Context; facts: CallerFacts }) => Grant<W, C> | undefined
) {
	return async (ctx: Context) => {
		const facts = await callerFacts(ctx);
		const first = derive({ ctx, facts });
		if (!first) return undefined;
		let derivedFrom = facts;
		let where: W | typeof NO_ROW = first.where;
		return {
			// a getter, read by rumble whenever it prepares the filter
			get where() {
				// the facts of the last finished load; the ones built from until one has finished
				const now = ctx.callerFactsCache.current ?? derivedFrom;
				if (now !== derivedFrom) {
					derivedFrom = now;
					where = derive({ ctx, facts: now })?.where ?? NO_ROW;
				}
				return where;
			},
			...(first.columns ? { columns: first.columns } : {})
		};
	};
}

/** `liveRule` for a rule that is only a filter (`grantWhere`). */
export function liveWhere<W extends object>(
	derive: (args: { ctx: Context; facts: CallerFacts }) => W | undefined
) {
	return liveRule(({ ctx, facts }) => {
		const where = derive({ ctx, facts });
		return where ? { where } : undefined;
	});
}
