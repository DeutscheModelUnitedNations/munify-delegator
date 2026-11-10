/** Who may do what: the filters and checks every `*Permissions.ts` composes its rules from. */
import { db, type schema, type Transaction } from '#api/db/db';
import { sql } from 'drizzle-orm';
import type { ApiContext } from '#api/rumble';
import type { Context } from '#api/context';
import type { teamRole } from '#api/db/schema/index';
import {
	PARTICIPANT_CARE_ROLES,
	rolesWithTeamPermission,
	type TeamPermission
} from '#lib/helpers/teamRoles';
import { m } from '#lib/paraglide/messages';
import { translateTeamRole } from '#lib/utils/enumTranslations';
import { apiError } from '#api/services/errors';
import { callerUserId } from './utils';
import {
	callerFacts,
	teamConferenceIdsIn,
	type CallerFacts,
	type ConferenceFlags
} from './callerFacts';

export type TeamRole = (typeof teamRole.enumValues)[number];

export {
	CONFERENCE_CONTENT_ROLES,
	PAPER_ROLES,
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES,
	TEAM_ADMIN_ROLES
} from '#lib/helpers/teamRoles';

/** For `abilityBuilder.x.allow(...).when(systemAdmin)`: the per-table stand-in for a wildcard. */
export function systemAdmin(ctx: Context) {
	return isSystemAdmin(ctx) ? ('allow' as const) : undefined;
}

/** The linked CHASE instance calling, with a token granting the `chase` role (`linkAuth`). */
function isLinkedChase(ctx: Context) {
	return ctx.hasRole('chase');
}

/** The conferences CHASE mirrors: every one that is not over yet. */
export const MIRRORED_CONFERENCE = { state: { ne: 'POST' as const } };

/** Mirrored conferences whose assignment is released: only then do participants reach CHASE. */
export const RELEASED_MIRRORED_CONFERENCE = { ...MIRRORED_CONFERENCE, assignmentReleased: true };

/**
 * For `.when(linkedChase(...))`: the rows the linked CHASE instance reads, and only the columns it
 * mirrors. Grants nothing to anybody else.
 */
export function linkedChase<R>(grant: R) {
	return (ctx: Context) => (isLinkedChase(ctx) ? grant : undefined);
}

/** System-wide admin, via the OIDC role claim. */
export function isSystemAdmin(ctx: Context) {
	return ctx.hasRole('admin');
}

/** What a rule builder reads: the request and what is known about the caller (`callerFacts`). */
export type RuleArgs = { ctx: Context; facts: CallerFacts };

/** A filter matching no row, for a query `where` that must not be left without one. */
export const NOTHING = { RAW: sql`false` };

/** `{ in: ids }`, for a filter on one of the table's own columns; an empty list matches nothing. */
export function idIn(ids: readonly string[]) {
	return { in: [...new Set(ids)] };
}

/** Whether a filter built here can match no row: `NOTHING`, or an empty id list among its conditions. */
function matchesNothing(filter: object) {
	return (
		filter === NOTHING ||
		Object.values(filter).some(
			(condition: unknown) =>
				typeof condition === 'object' &&
				condition !== null &&
				'in' in condition &&
				Array.isArray(condition.in) &&
				condition.in.length === 0
		)
	);
}

/**
 * `filter` nested into a relation (`wrap`), for a row that reaches the filtered column through
 * another table: `hop(isTeamMemberOfConference(args), (participant) => ({ participant }))`.
 * When `filter` can match nothing (an empty id list) the rule is `NOTHING` instead, so it needs no
 * hop to another table, and rumble no lookup, for a caller it does not reach. Undefined stays
 * undefined (nobody).
 */
export function hop<F extends object, R extends object>(
	filter: F | undefined,
	wrap: (filter: F) => R
) {
	if (filter === undefined) return undefined;
	return matchesNothing(filter) ? NOTHING : wrap(filter);
}

/**
 * The ids of the conferences whose team includes the caller, optionally only with one of `roles`;
 * `'all'` for a system admin, undefined (nobody) for an anonymous caller.
 *
 * An AI assistant (`ctx.mcp`) reaches only the conference of its tool call, if that has switched
 * MCP on: there the caller's own team roles count, and a system admin counts as holding every
 * one (the facts are confined so already, `callerFacts`). Every team rule goes through here, so
 * this is what confines an assistant.
 */
export function teamConferenceIds({
	ctx,
	facts,
	roles
}: RuleArgs & { roles?: readonly TeamRole[] }) {
	// Over MCP nobody holds a system role, so an admin's assistant is confined like anybody's.
	if (!ctx.mcp && isSystemAdmin(ctx)) return 'all' as const;
	// The session's user, not `callerUserId`, which an assistant's request leaves empty.
	if (!ctx.oidc.user?.sub) return undefined;
	return teamConferenceIdsIn({ facts, roles });
}

/**
 * Matches a Conference row whose team includes the caller, optionally only with one of `roles`
 * (`teamConferenceIds`): every conference for a system admin, undefined (nobody) for an anonymous
 * caller.
 */
export function isTeamMemberOf(args: RuleArgs & { roles?: readonly TeamRole[] }) {
	const ids = teamConferenceIds(args);
	if (ids === undefined) return undefined;
	return ids === 'all' ? {} : { id: idIn(ids) };
}

/**
 * `isTeamMemberOf` for a row with a `conferenceId` of its own: matches the rows of the conferences
 * whose team includes the caller. Nest it for a row that reaches its conference through another
 * (`{ participant: isTeamMemberOfConference(...) }`).
 */
export function isTeamMemberOfConference(args: RuleArgs & { roles?: readonly TeamRole[] }) {
	const ids = teamConferenceIds(args);
	if (ids === undefined) return undefined;
	return ids === 'all' ? {} : { conferenceId: idIn(ids) };
}

/**
 * The conferences in which the caller holds `permission`, as a filter on Conference rows to put
 * into a query: `where: { id, conference: await teamConference({ ctx, permission: 'manageParticipants' }) }`
 * finds nothing for a caller without it. Never undefined (which would match every row); it throws
 * for an anonymous caller instead.
 */
export async function teamConference({
	ctx,
	permission
}: {
	ctx: Context;
	permission: TeamPermission;
}) {
	ctx.mustBeLoggedIn();
	const facts = await callerFacts(ctx);
	return isTeamMemberOf({ ctx, facts, roles: rolesWithTeamPermission(permission) }) ?? NOTHING;
}

/**
 * Whether the caller holds the team `permission` in the conference, asked on its own: for a check
 * with no query of its own to carry `teamConference`. Answered from the caller's facts; only a
 * system admin's answer asks the database (whether the conference exists).
 */
export async function hasTeamPermission({
	ctx,
	conferenceId,
	permission
}: {
	ctx: Context;
	conferenceId: string;
	permission: TeamPermission;
}) {
	const ids = teamConferenceIds({
		ctx,
		facts: await callerFacts(ctx),
		roles: rolesWithTeamPermission(permission)
	});
	if (ids !== 'all') return ids?.includes(conferenceId) ?? false;
	// a system admin holds every permission, in a conference that exists
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { id: true }
	});
	return conference !== undefined;
}

/**
 * Refuses unless the caller holds the team `permission` in the conference (`hasTeamPermission`).
 *
 * This is how a create is authorized: there is no row of its own to run an ability against yet, so
 * the conference it goes into is checked for the permission.
 */
export async function assertTeamPermission({
	ctx,
	conferenceId,
	permission
}: {
	ctx: ApiContext;
	conferenceId: string;
	permission: TeamPermission;
}) {
	ctx.mustBeLoggedIn();
	if (!(await hasTeamPermission({ ctx, conferenceId, permission }))) {
		const roles = rolesWithTeamPermission(permission);
		throw apiError({
			code: 'FORBIDDEN',
			message: roles
				? m.accessDeniedTeamRoles({ roles: roles.map(translateTeamRole).join(', ') })
				: m.accessDeniedTeamMember()
		});
	}
}

/** Matches a row whose `userId` is the caller; undefined for an anonymous caller. */
export function isOwnUser(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { userId: id } : undefined;
}

/**
 * The caller's own `conferenceParticipant` ids (registered or not), for a row pointing at one:
 * `{ conferenceParticipantId: { in: ownParticipantIds(...) } }`. Undefined for an anonymous caller
 * and an AI assistant (`callerUserId`).
 */
export function ownParticipantIds({ ctx, facts }: RuleArgs) {
	return callerUserId(ctx) ? facts.participants.map((participant) => participant.id) : undefined;
}

/** Matches a row pointing at one of the caller's own `conferenceParticipant` rows. */
export function isOwnParticipation(args: RuleArgs) {
	const ids = ownParticipantIds(args);
	return ids ? { conferenceParticipantId: idIn(ids) } : undefined;
}

/** The ids of the delegations the caller is a member of; undefined for an anonymous caller. */
function ownDelegationIds({ ctx, facts }: RuleArgs) {
	return callerUserId(ctx)
		? facts.delegationMemberships.map((membership) => membership.delegationId)
		: undefined;
}

/** Matches a row whose `delegationId` is one of the caller's delegations; undefined for an anonymous caller. */
export function isInOwnDelegation(args: RuleArgs) {
	const ids = ownDelegationIds(args);
	return ids ? { delegationId: idIn(ids) } : undefined;
}

/** The ids of the delegations the caller supervises (one of their members). */
export function supervisedDelegationIds({ ctx, facts }: RuleArgs) {
	return callerUserId(ctx)
		? facts.supervised.flatMap((person) => (person.delegationId ? [person.delegationId] : []))
		: undefined;
}

/** A delegation with the conference it belongs to, for the participant-side release masks. */
export type DelegationInConference = { id: string; conferenceId: string };

/** The delegations the caller is a member of; undefined for an anonymous caller. */
export function ownDelegations({ ctx, facts }: RuleArgs): DelegationInConference[] | undefined {
	if (!callerUserId(ctx)) return undefined;
	return facts.delegationMemberships.map(({ delegationId, conferenceId }) => ({
		id: delegationId,
		conferenceId
	}));
}

/** The delegations the caller supervises (any of their members); undefined for an anonymous caller. */
export function supervisedDelegations({
	ctx,
	facts
}: RuleArgs): DelegationInConference[] | undefined {
	if (!callerUserId(ctx)) return undefined;
	return facts.supervised.flatMap(({ delegationId, conferenceId }) =>
		delegationId ? [{ id: delegationId, conferenceId }] : []
	);
}

/**
 * The ids of the delegations the caller leads as head delegate, `notApplied` only those that have
 * not applied yet; undefined for an anonymous caller.
 */
export function ledDelegationIds(
	{ ctx, facts }: RuleArgs,
	{ notApplied = false }: { notApplied?: boolean } = {}
) {
	if (!callerUserId(ctx)) return undefined;
	return facts.delegationMemberships
		.filter((membership) => membership.isHeadDelegate && (!notApplied || !membership.applied))
		.map((membership) => membership.delegationId);
}

/**
 * Participant care's way to rows of its conferences that hold the conference one relation away
 * (`via`, e.g. a member's `participant` or an answer's `question`): `isTeamMemberOfConference`
 * with the care roles, nested into that relation (`hop`).
 */
export function caredForVia<K extends string>(args: RuleArgs, via: K) {
	return hop(
		isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }),
		(filter) => ({ [via]: filter }) as Record<K, typeof filter>
	);
}

/**
 * A ConferenceParticipant row that is currently registered as delegate, single participant or
 * supervisor (the row outlives the registration). Team and waiting list never count.
 */
export const conferenceParticipantWithRegistration = {
	OR: [{ delegationMember: true }, { singleParticipant: true }, { conferenceSupervisor: true }]
};

/**
 * The ids of the conferences the caller is registered in as delegate, single participant or
 * supervisor; undefined for an anonymous caller and an AI assistant. Team and waiting list do not
 * count.
 */
function registeredConferenceIds({ ctx, facts }: RuleArgs) {
	return callerUserId(ctx)
		? facts.participants.filter((part) => part.registered).map((part) => part.conferenceId)
		: undefined;
}

/**
 * Matches a Conference row the caller is registered in as delegate, single participant or
 * supervisor - the participant counterpart of `isTeamMemberOf`. Team and waiting list do not count.
 */
export function isParticipantOf(args: RuleArgs) {
	const ids = registeredConferenceIds(args);
	return ids ? { id: idIn(ids) } : undefined;
}

/** `isParticipantOf` for a row with a `conferenceId` of its own. */
export function isParticipantOfConference(args: RuleArgs) {
	const ids = registeredConferenceIds(args);
	return ids ? { conferenceId: idIn(ids) } : undefined;
}

/** Whether the caller is registered in the conference (`isParticipantOf`), asked on its own. */
export async function isParticipantIn({
	ctx,
	conferenceId
}: {
	ctx: Context;
	conferenceId: string;
}) {
	return (
		registeredConferenceIds({ ctx, facts: await callerFacts(ctx) })?.includes(conferenceId) ?? false
	);
}

/**
 * Matches a ConferenceParticipant row registered (delegate, single participant or supervisor) in a
 * conference matching `conference`. A row kept after its registration ended does not match.
 */
function registeredParticipantIn(conference: { id: string } | object) {
	return { conference, ...conferenceParticipantWithRegistration };
}

/** Matches a User row registered as participant in a conference matching `conference`. */
export function participatesIn(conference: { id: string } | object) {
	return { conferenceParticipants: registeredParticipantIn(conference) };
}

/**
 * The User rows in the caller's care: the participants (`participatesIn`) and waiting-list
 * entrants of a conference where the caller is participant care or project management. A system admin looks after
 * everybody. The team is not among them: care notes are about participants, and a teammate's
 * (perhaps from when they took part themselves) is not their colleagues' to read. What the team
 * admins need of their team for planning is its own rule on the user table.
 *
 * The one rule about other people that stays relational (a hop to their participant rows and
 * waiting list entries, by their own `conferenceId`): the set is a whole conference, too large to
 * carry as a list; rumble resolves it to an id list while it is no longer than its `maxIds`.
 */
export function isCaredForUser(args: RuleArgs) {
	const ids = teamConferenceIds({ ...args, roles: PARTICIPANT_CARE_ROLES });
	if (ids === undefined) return undefined;
	if (ids === 'all') return {};
	if (ids.length === 0) return NOTHING;
	const conferenceId = idIn(ids);
	return {
		OR: [
			{ conferenceParticipants: { conferenceId, ...conferenceParticipantWithRegistration } },
			{ waitingListEntry: { conferenceId } }
		]
	};
}

/** `isCaredForUser` for code outside the rules, which waits for the caller's facts. */
export async function caredForUser(ctx: Context) {
	return isCaredForUser({ ctx, facts: await callerFacts(ctx) });
}

/**
 * Matches a public Conference row: open for registration or, from the assignment on, for the
 * waiting list. Anybody reads such a conference, short of its members-only columns.
 */
export const publicConference = {
	state: {
		in: ['PARTICIPANT_REGISTRATION', 'PREPARATION'] satisfies ConferenceState[]
	}
};

type ConferenceState = (typeof schema.conferenceState.enumValues)[number];

/**
 * The ids of the conferences the caller has a part in - as participant (delegate, single
 * participant, supervisor) or on the team; `'all'` for a system admin, undefined for an anonymous
 * caller. `asParticipant` narrows the participant way only.
 */
function partInConferenceIds({
	ctx,
	facts,
	asParticipant = () => true
}: RuleArgs & { asParticipant?: (conference: ConferenceFlags) => boolean }) {
	const team = teamConferenceIds({ ctx, facts });
	if (team === 'all') return team;
	const participant = registeredConferenceIds({ ctx, facts })?.filter((id) => {
		const flags = facts.conferences.get(id);
		return flags !== undefined && asParticipant(flags);
	});
	if (team === undefined && participant === undefined) return undefined;
	return [...(participant ?? []), ...(team ?? [])];
}

/** The way the rules ask for a part in a conference: `partInConferenceIds`'s `asParticipant`. */
export type PartIn = RuleArgs & { asParticipant?: (conference: ConferenceFlags) => boolean };

/**
 * Matches a Conference row the caller has a part in, as participant or on the team; undefined for
 * an anonymous caller. `asParticipant` narrows what participants get to see, the team always
 * does: `hasPartIn({ ctx, facts, asParticipant: (c) => c.showCalendar })` for the schedule.
 */
export function hasPartIn(args: PartIn) {
	const ids = partInConferenceIds(args);
	if (ids === undefined) return undefined;
	return ids === 'all' ? {} : { id: idIn(ids) };
}

/** `hasPartIn` for a row with a `conferenceId` of its own. */
export function hasPartInConference(args: PartIn) {
	const ids = partInConferenceIds(args);
	if (ids === undefined) return undefined;
	return ids === 'all' ? {} : { conferenceId: idIn(ids) };
}

/**
 * `{ OR: filters }`, matching everything when one of them does: drizzle drops an empty filter from
 * an `OR`, so a system admin's team way (`{}`) would otherwise match nothing.
 */
export function anyOf(filters: readonly object[]) {
	return filters.some((filter) => Object.keys(filter).length === 0) ? {} : { OR: [...filters] };
}

/**
 * The ids of the conferences the caller may read: the public ones (`publicConference`) and those
 * they have a part in; `'all'` for a system admin.
 */
function readableConferenceIds(args: RuleArgs) {
	const part = partInConferenceIds(args);
	return part === 'all' ? part : [...args.facts.publicConferenceIds, ...(part ?? [])];
}

/**
 * The conferences the caller may read: the public ones and those they have a part in. What only
 * makes sense next to a conference - its committees, agenda items and roles, which the seat
 * overview shows - follows it, so a conference in PRE or POST hides its set-up from strangers too.
 */
export function readableConference(args: RuleArgs) {
	const ids = readableConferenceIds(args);
	return ids === 'all' ? {} : { id: idIn(ids) };
}

/** `readableConference` for a row with a `conferenceId` of its own. */
export function readableConferenceRows(args: RuleArgs) {
	const ids = readableConferenceIds(args);
	return ids === 'all' ? {} : { conferenceId: idIn(ids) };
}

/**
 * The `conferenceParticipant` ids of `userIds` in the conference, by user id. Refuses unless every
 * one of them takes part in it (delegate, single participant or supervisor), so writes that name
 * other people by id can use it as their guard and get the rows to point at in one go.
 */
export async function participantIdsOf({
	conferenceId,
	userIds,
	tx = db
}: {
	conferenceId: string;
	userIds: readonly string[];
	tx?: Transaction | typeof db;
}): Promise<Map<string, string>> {
	const unique = [...new Set(userIds)];
	if (unique.length === 0) return new Map();
	const found = await tx.query.conferenceParticipant.findMany({
		where: { conferenceId, userId: { in: unique }, ...conferenceParticipantWithRegistration },
		columns: { id: true, userId: true }
	});
	if (found.length !== unique.length) {
		throw apiError({ code: 'INVALID_INPUT', message: m.usersNotInConference() });
	}
	return new Map(found.map((row) => [row.userId, row.id]));
}

/**
 * Assignment visibility. Participants see the role they were assigned only once the team releases
 * the assignment (`conference.assignmentReleased`); the team always sees it. Before that, every
 * participant-side read rule comes in two variants: `maskedUntilRelease` lets the participant read
 * the row without its assignment, the other adds the assignment back for the rows of released
 * conferences (`releasedIds`). Rumble masks per row, so a row shows a column if any rule it matches
 * does, and it follows the masks everywhere else (relations, `where`, `orderBy`), so nothing else
 * is needed.
 */

/** A participant-side rule that reads the row but not its assignment (`assignmentColumns`). */
export function maskedUntilRelease<W extends object, C extends object>({
	filter,
	assignmentColumns
}: {
	filter: W | undefined;
	assignmentColumns: C;
}) {
	return filter ? { where: filter, columns: assignmentColumns } : undefined;
}

/** The ids of `rows` whose conference has released its assignment, by the caller's facts. */
export function releasedIds({
	facts,
	rows
}: {
	facts: CallerFacts;
	rows: readonly { id: string; conferenceId: string }[];
}) {
	return rows
		.filter((row) => facts.conferences.get(row.conferenceId)?.assignmentReleased)
		.map((row) => row.id);
}
