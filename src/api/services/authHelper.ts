import { db } from '$api/db/db';
import { sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import type { Context } from '$api/context';
import type { teamRole } from '$api/db/schema';
import { DELEGATION_ROLE_KINDS, type ConferenceRoleKind } from '#lib/helpers/conferenceRole.js';

/** The TeamRole enum values, taken from the schema so role lists stay type-checked. */
export type TeamRole = (typeof teamRole.enumValues)[number];

/**
 * Shared authorization, after munify-chase's `authHelper.ts`.
 *
 * There are two kinds of helper here, and they are built from the same pieces on purpose:
 *
 * - **Filters** (`isTeamMemberOf`, `isOwnUser`, …) return a drizzle relational `where` shape for
 *   `abilityBuilder.<table>.allow(...).when(...)`, or `undefined` when the rule grants nothing
 *   for this request. They never throw: an anonymous request simply matches no rule.
 * - **Assertions** (`assertTeamRole`, …) answer "may the caller do this here" when there is no
 *   row to filter yet - creating something inside a conference. They run the very filter the
 *   abilities use against the conference row, so a create and the update/delete of what it
 *   created can never disagree about who is on the team.
 *
 * Who may do what, in one place:
 *
 * | Who                         | Scope                                                                |
 * | --------------------------- | -------------------------------------------------------------------- |
 * | system admin (OIDC `admin`) | everything, everywhere, whether on the team or not                   |
 * | PROJECT_MANAGEMENT          | the conference, its structure, team, participants; deleting papers;  |
 * |                             | publishing the adopted resolutions                                   |
 * | PARTICIPANT_CARE            | the participants, their papers (as reviewers), calendar and places   |
 * | TEAM_COORDINATOR            | the team and its members' details, short of granting PROJECT_MANAGEMENT |
 * | CONTENT_LEAD                | the seat planning: which nations sit in which committee, the         |
 * |                             | non-state actors and the committees' regional baselines              |
 * | REVIEWER                    | reading, reviewing and editing the conference's papers               |
 * | any role but MEMBER         | the same: reading, reviewing and editing the conference's papers     |
 * | any team role               | reading registrations, recording attendance, teammates' phone numbers |
 * | participants                | their registration, delegation, survey answers, and the submitted    |
 * |                             | papers of their own delegation (an author deletes a draft of theirs) |
 * | supervisors                 | the participants they supervise, contact details included            |
 * | anybody with a part in it   | the conference's payment and postal details, documents and adopted   |
 * |                             | resolutions                                                          |
 *
 * Registering, joining and editing a registration are open in every stage; only sending an
 * application is bound to the registration stage (`assertApplicationReady`).
 *
 * An empty object `{}` means "no restriction"; that is how a system admin passes a filter, since
 * rumble has no global wildcard.
 */

// The role lists live in `#lib/helpers/teamRoles`, where the pages' own checks share them.
export {
	CONFERENCE_CONTENT_ROLES,
	PAPER_ROLES,
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES,
	TEAM_ADMIN_ROLES
} from '#lib/helpers/teamRoles.js';
import {
	PARTICIPANT_CARE_ROLES,
	PROJECT_MANAGEMENT_ROLES,
	SEAT_PLANNING_ROLES,
	TEAM_ADMIN_ROLES
} from '#lib/helpers/teamRoles.js';
import { m } from '#lib/paraglide/messages.js';
import { translateTeamRole } from '#lib/utils/enumTranslations.js';
import { apiError } from '$api/services/errors/apiError';

/** For `abilityBuilder.x.allow(...).when(systemAdmin)`: the per-table stand-in for a wildcard. */
export function systemAdmin(ctx: Context) {
	return isSystemAdmin(ctx) ? ('allow' as const) : undefined;
}

/** System-wide admin, via the OIDC role claim. */
export function isSystemAdmin(ctx: Context) {
	return ctx.hasRole('admin');
}

/** The logged-in user's id, or undefined for anonymous requests. */
export function userId(ctx: Context) {
	return ctx.oidc.user?.sub;
}

/** Wraps a filter for `.when()`: no filter means the rule grants nothing. */
export function where<W extends object>(filter: W | undefined) {
	return filter ? { where: filter } : undefined;
}

/** Matches a Conference row whose team includes the user, optionally with one of `roles`. */
export function isTeamMemberOf(ctx: Context, roles?: readonly TeamRole[]) {
	if (isSystemAdmin(ctx)) return {};
	const id = userId(ctx);
	if (!id) return undefined;
	return {
		teamMembers: roles ? { user: { id }, role: { in: [...roles] } } : { user: { id } }
	};
}

/** Matches a row whose `conference` has the user on its team, optionally with one of `roles`. */
export function isTeamMemberOfConference(ctx: Context, roles?: readonly TeamRole[]) {
	const conference = isTeamMemberOf(ctx, roles);
	return conference === undefined ? undefined : { conference };
}

/** Matches rows belonging to the logged-in user through a `user` relation. */
export function isOwnUser(ctx: Context) {
	const id = userId(ctx);
	return id ? { user: { id } } : undefined;
}

/** Matches a row whose `delegation` has the logged-in user among its members. */
export function isInOwnDelegation(ctx: Context) {
	const id = userId(ctx);
	return id ? { delegation: { members: { user: { id } } } } : undefined;
}

/**
 * Matches a row whose `conference` the user takes part in as delegate, single participant or
 * supervisor - the participant-side counterpart of `isTeamMemberOfConference`.
 */
export function isParticipantOfConference(ctx: Context) {
	const id = userId(ctx);
	if (!id) return undefined;
	return {
		conference: {
			OR: [
				{ delegations: { members: { participant: { userId: id } } } },
				{ singleParticipants: { participant: { userId: id } } },
				{ conferenceSupervisors: { participant: { userId: id } } }
			]
		}
	};
}

/** A User row taking part in the conference as delegate, single participant or supervisor. */
export function participatesIn(conference: { id: string } | object) {
	return {
		OR: [
			{ delegationMemberships: { delegation: { conference } } },
			{ singleParticipant: { conference } },
			{ conferenceSupervisor: { conference } }
		]
	};
}

/**
 * The User rows the caller looks after: the participants, waiting-list entrants and team of a
 * conference where the caller is participant care or project management. A system admin looks
 * after everybody.
 */
export function isManagedUser(ctx: Context) {
	if (isSystemAdmin(ctx)) return {};
	const conference = isTeamMemberOf(ctx, PARTICIPANT_CARE_ROLES);
	if (!conference) return undefined;
	return {
		OR: [
			...participatesIn(conference).OR,
			{ waitingListEntry: { conference } },
			{ teamMember: { conference } }
		]
	};
}

/** Answers of `hasTeamRole`, per request: field resolvers ask it once per row. */
const teamRoleAnswers = new WeakMap<object, Map<string, Promise<boolean>>>();

/** Whether the caller holds one of `roles` on the conference's team, or is a system admin. */
// fallow-ignore-next-line complexity
export function hasTeamRole(
	ctx: Context,
	conferenceId: string,
	roles?: readonly TeamRole[]
): Promise<boolean> {
	const team = isTeamMemberOf(ctx, roles);
	if (!team) return Promise.resolve(false);

	let answers = teamRoleAnswers.get(ctx);
	if (!answers) {
		answers = new Map();
		teamRoleAnswers.set(ctx, answers);
	}
	const key = `${conferenceId}:${roles?.join(',') ?? '*'}`;
	const known = answers.get(key);
	if (known) return known;

	const answer = db.query.conference
		.findFirst({ where: { id: conferenceId, ...team }, columns: { id: true } })
		.then((conference) => conference !== undefined);
	answers.set(key, answer);
	return answer;
}

/**
 * Refuses unless the caller holds one of `roles` on the conference's team (any team role when
 * omitted), or is a system admin.
 *
 * This is how a create is authorized: there is no row to run an ability filter against yet, so
 * the conference it goes into is checked with the same filter the abilities use.
 */
export async function assertTeamRole(
	ctx: Context,
	conferenceId: string,
	roles?: readonly TeamRole[]
) {
	ctx.mustBeLoggedIn();
	if (!(await hasTeamRole(ctx, conferenceId, roles))) {
		throw apiError(
			'FORBIDDEN',
			roles
				? m.accessDeniedTeamRoles({ roles: roles.map(translateTeamRole).join(', ') })
				: m.accessDeniedTeamMember()
		);
	}
}

/**
 * Refuses to hand out a team role the caller may not grant: project management and team
 * coordinators manage the team, but only project management (or an admin) makes somebody project
 * management - otherwise a coordinator could promote themselves.
 */
export async function assertMayGrantRole(ctx: Context, conferenceId: string, role: TeamRole) {
	await assertTeamRole(
		ctx,
		conferenceId,
		role === 'PROJECT_MANAGEMENT' ? PROJECT_MANAGEMENT_ROLES : TEAM_ADMIN_ROLES
	);
}

/** Same check, for rows that reach their conference through a calendar day. */
export async function assertTeamRoleForCalendarDay(
	ctx: Context,
	calendarDayId: string,
	roles: readonly TeamRole[] = PARTICIPANT_CARE_ROLES
) {
	const day = await db.query.calendarDay.findFirst({
		where: { id: calendarDayId },
		columns: { conferenceId: true }
	});
	if (!day) {
		throw apiError('NOT_FOUND', m.calendarDayNotFound());
	}
	await assertTeamRole(ctx, day.conferenceId, roles);
	return day;
}

/** Same check, for rows that reach their conference through a survey question. */
export async function assertTeamRoleForSurveyQuestion(
	ctx: Context,
	questionId: string,
	roles: readonly TeamRole[] = PARTICIPANT_CARE_ROLES
) {
	const question = await db.query.surveyQuestion.findFirst({
		where: { id: questionId },
		columns: { conferenceId: true }
	});
	if (!question) {
		throw apiError('NOT_FOUND', m.surveyQuestionNotFound());
	}
	await assertTeamRole(ctx, question.conferenceId, roles);
}

/**
 * Refuses with NOT_FOUND unless a row of `table` matches `allowed`: the row's own ability filter
 * merged with its id, `(await ctx.abilities.x.filter('delete')).merge({ where: { id } }).sql.where`.
 * This is how an update or delete is authorized when the resolver needs nothing of the row; a
 * missing row and a forbidden one look the same, so neither leaks the other.
 */
export async function assertAllowedRow(
	table: PgTable,
	allowed: SQL | undefined,
	message: () => string = m.deleteNotFoundOrForbidden
) {
	const [row] = await db
		.select({ found: sql`1` })
		.from(table)
		.where(allowed)
		.limit(1);
	if (!row) {
		throw apiError('NOT_FOUND', message());
	}
}

/**
 * The `conferenceParticipant` ids of `userIds` in the conference, by user id. Refuses unless every
 * one of them takes part in it (delegate, single participant or supervisor), so writes that name
 * other people by id can use it as their guard and get the rows to point at in one go.
 */
export async function participantIdsOf(
	conferenceId: string,
	userIds: readonly string[]
): Promise<Map<string, string>> {
	const unique = [...new Set(userIds)];
	if (unique.length === 0) return new Map();
	const found = await db.query.conferenceParticipant.findMany({
		where: {
			conferenceId,
			userId: { in: unique },
			user: participatesIn({ id: conferenceId })
		},
		columns: { id: true, userId: true }
	});
	if (found.length !== unique.length) {
		throw apiError('INVALID_INPUT', m.usersNotInConference());
	}
	return new Map(found.map((row) => [row.userId, row.id]));
}

/**
 * Refuses unless the user takes part in the conference or is on its team. Guards writes about one
 * person, such as attendance or a participant status, that name them by id.
 */
export async function assertUserInConference(conferenceId: string, userId: string) {
	const user = await db.query.user.findFirst({
		where: {
			id: userId,
			OR: [...participatesIn({ id: conferenceId }).OR, { teamMember: { conferenceId } }]
		},
		columns: { id: true }
	});
	if (!user) {
		throw apiError('INVALID_INPUT', m.userNotInConference());
	}
}

/**
 * Refuses unless the caller takes part in the conference (delegate, single participant or
 * supervisor), or is a system admin.
 */
export async function assertParticipantOfConference(ctx: Context, conferenceId: string) {
	const caller = ctx.mustBeLoggedIn().sub;
	if (isSystemAdmin(ctx)) return;
	const participant = await db.query.user.findFirst({
		where: { id: caller, ...participatesIn({ id: conferenceId }) },
		columns: { id: true }
	});
	if (!participant) {
		throw apiError('FORBIDDEN', m.accessDeniedParticipant());
	}
}

/**
 * Whether the conference has the role and committee the arguments name, and the role is of one
 * of `roleKinds` (a delegation's by default); an absent one passes. A nation is the conference's
 * while one of its committees seats it, which `setCommitteeNationSeat` keeps its role row for.
 */
export async function offeredIn(
	conferenceId: string,
	ref: { roleId?: string | null; committeeId?: string | null },
	roleKinds: readonly ConferenceRoleKind[] = DELEGATION_ROLE_KINDS
) {
	const [role, committee] = await Promise.all([
		ref.roleId
			? db.query.conferenceRole.findFirst({
					where: { id: ref.roleId, conferenceId, kind: { in: [...roleKinds] } },
					columns: { id: true }
				})
			: true,
		ref.committeeId
			? db.query.committee.findFirst({
					where: { id: ref.committeeId, conferenceId },
					columns: { id: true }
				})
			: true
	]);
	return Boolean(role && committee);
}

/** Refuses a role or committee that the conference does not have. */
export async function assertOfferedIn(
	conferenceId: string,
	ref: Parameters<typeof offeredIn>[1],
	roleKinds?: readonly ConferenceRoleKind[]
) {
	if (!(await offeredIn(conferenceId, ref, roleKinds))) {
		throw apiError('INVALID_INPUT', m.roleNotOnOffer());
	}
}

/** Refuses role ids that are not custom roles of the given conference. */
export async function assertCustomRolesOf(conferenceId: string, roleIds: readonly string[]) {
	const unique = [...new Set(roleIds)];
	if (unique.length === 0) return;
	const roles = await db.query.conferenceRole.findMany({
		where: { id: { in: unique }, conferenceId, kind: 'CUSTOM' },
		columns: { id: true }
	});
	if (roles.length !== unique.length) {
		throw apiError('INVALID_INPUT', m.rolesNotInConference());
	}
}

/**
 * Assignment visibility. Participants see the role they were assigned only once the team releases
 * the assignment (`conference.assignmentReleased`); the team always sees it. Before that, every
 * participant-side read rule comes in two variants: `maskedUntilRelease` lets the participant read
 * the row without its assignment, `onceReleased` adds the assignment back for released
 * conferences. Rumble masks per row, so a row shows a column if any rule it matches does, and it
 * follows the masks everywhere else (relations, `where`, `orderBy`), so nothing else is needed.
 */

/** The column that carries a delegation's assignment. */
export const DELEGATION_ASSIGNMENT = { assignedRoleId: false } as const;

/** The column that carries the committee a delegate was seated in. */
export const DELEGATION_MEMBER_ASSIGNMENT = { assignedCommitteeId: false } as const;

/** The columns that carry a single participant's assignment. */
export const SINGLE_PARTICIPANT_ASSIGNMENT = {
	assignedRoleId: false,
	assignmentDetails: false
} as const;

/** A participant-side rule that reads the row but not its assignment. */
export function maskedUntilRelease<W extends object, C extends object>(
	filter: W | undefined,
	assignmentColumns: C
) {
	return filter ? { where: filter, columns: assignmentColumns } : undefined;
}

/** The same rule in full, for conferences whose assignment is released. */
export function onceReleased<W extends object>(filter: W | undefined) {
	return filter ? { where: { ...filter, conference: { assignmentReleased: true } } } : undefined;
}
