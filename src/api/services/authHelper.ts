import { db } from '$api/db/db';
import type { Context } from '$api/context';
import { GraphQLError } from 'graphql';
import type { teamRole } from '$api/db/schema';

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

export const PARTICIPANT_CARE_ROLES = [
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamRole[];

/** Roles that may see and review the conference's papers. */
export const PAPER_ROLES = [
	'REVIEWER',
	'PROJECT_MANAGEMENT',
	'PARTICIPANT_CARE'
] as const satisfies readonly TeamRole[];

/** Roles that manage the conference's team. */
export const TEAM_ADMIN_ROLES = [
	'PROJECT_MANAGEMENT',
	'TEAM_COORDINATOR'
] as const satisfies readonly TeamRole[];

/** Roles that plan the seats: committee seats per nation, non-state actors, regional baselines. */
export const SEAT_PLANNING_ROLES = [
	'PROJECT_MANAGEMENT',
	'CONTENT_LEAD'
] as const satisfies readonly TeamRole[];

/** Only the conference's leadership. */
export const PROJECT_MANAGEMENT_ROLES = [
	'PROJECT_MANAGEMENT'
] as const satisfies readonly TeamRole[];

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
				{ delegations: { members: { userId: id } } },
				{ singleParticipants: { userId: id } },
				{ conferenceSupervisors: { userId: id } }
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
		throw new GraphQLError(
			roles
				? `Access denied - requires one of: ${roles.join(', ')}`
				: 'Access denied - requires team member status'
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
		throw new GraphQLError('Calendar day not found');
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
		throw new GraphQLError('Survey question not found');
	}
	await assertTeamRole(ctx, question.conferenceId, roles);
}

/**
 * Refuses unless every one of `userIds` takes part in the conference (delegate, single
 * participant or supervisor). Guards writes that name other people by id.
 */
export async function assertParticipantsOf(conferenceId: string, userIds: readonly string[]) {
	const unique = [...new Set(userIds)];
	if (unique.length === 0) return;
	const found = await db.query.user.findMany({
		where: { id: { in: unique }, ...participatesIn({ id: conferenceId }) },
		columns: { id: true }
	});
	if (found.length !== unique.length) {
		throw new GraphQLError('Not every given user takes part in this conference');
	}
}
