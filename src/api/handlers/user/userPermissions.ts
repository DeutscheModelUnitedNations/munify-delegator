import { m } from '#lib/paraglide/messages';
import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	caredForUser,
	idIn,
	isCaredForUser,
	isSystemAdmin,
	linkedChase,
	MIRRORED_CONFERENCE,
	PAPER_ROLES,
	PARTICIPANT_CARE_ROLES,
	participatesIn,
	RELEASED_MIRRORED_CONFERENCE,
	systemAdmin,
	TEAM_ADMIN_ROLES,
	teamConferenceIds,
	type RuleArgs,
	type TeamRole
} from '#api/services/authHelper/rules';
import { liveRule, liveWhere } from '#api/services/authHelper/callerFacts';
import { assertAllowed, callerUserId } from '#api/services/authHelper/utils';
import type { RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import type { OIDCSession } from '@m1212e/sveltekit-oidc';
import { rolesOfSession, type Context } from '#api/context';
import { OIDC } from '#api/services/oidc/OIDC';
import { logger } from '#lib/logger';
import { apiError } from '#api/services/errors';
import { normalizeEmailAddress } from '@m1212e/rumble';

/**
 * What of a user's row a reader sees depends on how the reader relates to that row, and rumble
 * masks columns per row: each rule's `columns` apply to the rows that rule matched.
 *
 * - the person themselves: everything but the care team's notes about them;
 * - who looks after them (participant care, project management, admins): everything - for the
 *   participants and the waiting list of their conference, not for the team;
 * - their supervisors: everything but those notes;
 * - teammates: `IDENTITY` plus their phone number - team admins (project management, team
 *   coordinators): everything but the care notes;
 * - the people a supervisor looks after, the supervisor's co-supervisors, and co-delegates:
 *   `NAME_AND_EMAIL`, to get in touch. Co-delegates are mostly minors, so no more than that: no
 *   phone, no birthday (whether a co-delegate is of age is `conferenceParticipant.ofAgeAtConference`);
 * - the reviewers of a paper reading its author: `NAME` only; they need not reach the person
 *   outside the app;
 * - an author reading who reviewed their papers: the reviewer's name.
 */
/** Who someone is, as the app shows them to people who share something with them. */
const NAME = {
	id: true,
	createdAt: true,
	updatedAt: true,
	givenName: true,
	familyName: true,
	pronouns: true
};
/** `NAME`, and how to write to them. */
const NAME_AND_EMAIL = { ...NAME, email: true };
/** Enough to tell people apart: for the team, and the care team comparing possible duplicates. */
const IDENTITY = {
	...NAME_AND_EMAIL,
	preferredUsername: true,
	locale: true,
	birthday: true
};
const WITHOUT_CARE_NOTES = { globalNotes: false };

/**
 * Matches the User rows paired, in a possible duplicate of one of `status`, with an account in the
 * caller's care (`isCaredForUser`): the other account of each pair (`careDuplicates`).
 */
function duplicateOfCaredForUser({
	ctx,
	facts,
	status
}: RuleArgs & { status: ('OPEN' | 'CONFIRMED' | 'DISMISSED')[] }) {
	if (!isCaredForUser({ ctx, facts })) return undefined;
	const pairs = facts.careDuplicates.filter((pair) => status.includes(pair.status));
	return { id: idIn(pairs.map((pair) => pair.userId)) };
}

/**
 * Matches the User rows of `userIds` for a caller signed in as themselves; undefined (nobody) for
 * an anonymous caller and an AI assistant (`callerUserId`), whose own part counts nowhere.
 */
function callersPeople({ ctx, userIds }: { ctx: Context; userIds: readonly string[] }) {
	return callerUserId(ctx) ? { id: idIn(userIds) } : undefined;
}

/**
 * Matches the User rows on the team of a conference where the caller holds one of `roles` (any
 * role without): `teammates`. A system admin's way matches everybody on any team.
 */
function teammatesOf({ ctx, facts, roles }: RuleArgs & { roles?: readonly TeamRole[] }) {
	const ids = teamConferenceIds({ ctx, facts, roles });
	if (!ids) return undefined;
	if (ids === 'all') return { teamMember: true };
	const conferences = new Set(ids);
	return {
		id: idIn(
			facts.teammates
				.filter((mate) => conferences.has(mate.conferenceId))
				.map((mate) => mate.userId)
		)
	};
}

export function registerUserAbilities() {
	// The linked CHASE mirrors the team of every conference it mirrors, and the participants once the
	// assignment is released: their name and email only (`docs/plans/chase-link.md`).
	abilityBuilder.user.allow('read').when(
		linkedChase({
			where: {
				OR: [
					{ teamMember: { conference: MIRRORED_CONFERENCE } },
					{ conferenceParticipants: { conference: RELEASED_MIRRORED_CONFERENCE } }
				]
			},
			columns: { id: true, email: true, givenName: true, familyName: true }
		})
	);

	abilityBuilder.user.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everyone reads their own account, but for the care notes about them, and updates it.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { id }, columns: WITHOUT_CARE_NOTES } : undefined;
	});
	abilityBuilder.user.allow('update').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { id } } : undefined;
	});

	// Participant care (project management and participant care) reads the participants and waiting
	// list entrants of its conferences in full; not the team (`isCaredForUser`).
	abilityBuilder.user.allow('read').when(liveWhere(isCaredForUser));

	// Participant care reads the other account of a possible duplicate of someone in its care: while
	// the pair is open or confirmed its identity and care notes (the reason the pair is shown), no
	// contact details; once dismissed only the identity, so the dismissal can still be undone.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const where = duplicateOfCaredForUser({ ctx, facts, status: ['OPEN', 'CONFIRMED'] });
			return where ? { where, columns: { ...IDENTITY, globalNotes: true } } : undefined;
		})
	);
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const where = duplicateOfCaredForUser({ ctx, facts, status: ['DISMISSED'] });
			return where ? { where, columns: IDENTITY } : undefined;
		})
	);

	// Supervisors read the delegates and single participants they supervise, all but the care notes.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const registered = facts.supervised.filter(
				(person) => person.delegationMemberId || person.singleParticipantId
			);
			const where = callersPeople({ ctx, userIds: registered.map((person) => person.userId) });
			return where ? { where, columns: WITHOUT_CARE_NOTES } : undefined;
		})
	);

	// Team admins (project management and team coordinators) read their conference's team, all but
	// the care notes: the team members page lists address, gender and food preference for planning.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const where = teammatesOf({ ctx, facts, roles: TEAM_ADMIN_ROLES });
			return where ? { where, columns: WITHOUT_CARE_NOTES } : undefined;
		})
	);

	// Team members read the identity and phone number of everybody on a team they share.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const where = teammatesOf({ ctx, facts });
			return where ? { where, columns: { ...IDENTITY, phone: true } } : undefined;
		})
	);

	// Delegates read their co-delegates' names and email addresses, to get in touch.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const userIds = facts.delegationMates.map((mate) => mate.userId);
			const where = callersPeople({ ctx, userIds });
			return where ? { where, columns: NAME_AND_EMAIL } : undefined;
		})
	);

	// Delegates and single participants read the names and email addresses of their supervisors.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const userIds = facts.ownSupervisors.map((supervisor) => supervisor.userId);
			const where = callersPeople({ ctx, userIds });
			return where ? { where, columns: NAME_AND_EMAIL } : undefined;
		})
	);

	// Supervisors read the names and email addresses of the co-supervisors of their students.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const userIds = facts.coSupervisors.map((supervisor) => supervisor.userId);
			const where = callersPeople({ ctx, userIds });
			return where ? { where, columns: NAME_AND_EMAIL } : undefined;
		})
	);

	// The paper roles (everybody on the team but plain members) read the names of the authors of
	// their conference's papers. A paper's `author` is non-nullable, so without this one paper by
	// someone they may not otherwise read fails the whole review page.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const ids = teamConferenceIds({ ctx, facts, roles: PAPER_ROLES });
			if (!ids) return undefined;
			const where = ids === 'all' ? { papers: true } : { id: idIn(facts.paperTeamAuthorUserIds) };
			return { where, columns: NAME };
		})
	);

	// Authors read the names of whoever reviewed their papers. A review's `reviewer` is non-nullable,
	// so without this the paper's history fails for an author who may not otherwise read the reviewer.
	abilityBuilder.user.allow('read').when(
		liveRule(({ ctx, facts }) => {
			const userIds = facts.authoredPapers.flatMap((paper) => paper.reviewerIds);
			const where = callersPeople({ ctx, userIds });
			return where
				? { where, columns: { id: true, givenName: true, familyName: true } }
				: undefined;
		})
	);
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches user `id`: their own account, or
 * anybody's for a system admin. The care team corrects identities through `assertCanManageUser`.
 */
export async function assertCanUpdateUser({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'user', action: 'update', id });
}

/**
 * Refuses (NOT_FOUND) unless the user is in the caller's care (`isCaredForUser`: project
 * management and participant care of a conference the person takes part in or waits for, never
 * for a teammate; a system admin for anybody): for the care team's edits of somebody else's
 * account, not self-service.
 */
export async function assertCanManageUser({ ctx, id }: { ctx: Context; id: string }) {
	ctx.mustBeLoggedIn();
	const managed = await caredForUser(ctx);
	const found = managed
		? await db.query.user.findFirst({ where: { id, ...managed }, columns: { id: true } })
		: undefined;
	if (!found) {
		throw apiError({ code: 'NOT_FOUND', message: m.userNotFoundOrNotSupervised() });
	}
}

/**
 * The parts of a user's participation in one conference the caller may delete, as one SQL `where`
 * per table, each through that table's delete ability: a caller allowed to remove one kind of
 * participation but not another removes only what they may.
 */
export async function deletableParticipation({
	ctx,
	userId,
	conferenceId
}: {
	ctx: ApiContext;
	userId: string;
	conferenceId: string;
}) {
	const scope = { conferenceId, userId };
	// the registrations name the conference and the user through the person's part in it
	const throughParticipant = { participant: scope };
	return {
		delegationMember: (await ctx.abilities.delegationMember.filter('delete')).merge({
			where: throughParticipant
		}).sql.where,
		singleParticipant: (await ctx.abilities.singleParticipant.filter('delete')).merge({
			where: throughParticipant
		}).sql.where,
		conferenceSupervisor: (await ctx.abilities.conferenceSupervisor.filter('delete')).merge({
			where: throughParticipant
		}).sql.where,
		conferenceParticipant: (await ctx.abilities.conferenceParticipant.filter('delete')).merge({
			where: scope
		}).sql.where
	};
}

/**
 * Refuses an opt-in to a newsletter unless the caller is signed in with `email` (compared as the
 * `EmailAddress` scalar normalises it); an opt-out passes
 * for anybody, signed in or not, since it backs the unsubscribe link in outgoing mail. Opting in is
 * consent, which only the account itself may give.
 *
 * TODO(security): anybody can switch anybody's newsletters off, since the address is the only
 * thing the link carries. The fix is a signed token in the link: an HMAC of the user id under a
 * secret the app and the jobs share, written by the mail sync into the Listmonk subscriber's
 * attribs (next to `userId`, also nulled on release), put into the link by the Listmonk newsletter
 * template, and checked here instead of allowing anonymous opt-outs. Needs the template changed in
 * Listmonk, so it waits until that can be done together.
 */
export function assertCanUpdateNewsletterPreferences({
	ctx,
	args
}: {
	ctx: Context;
	args: {
		email: string;
		wantsToReceiveGeneralInformation?: boolean | null;
		wantsJoinTeamInformation?: boolean | null;
	};
}) {
	const optsIn = args.wantsToReceiveGeneralInformation || args.wantsJoinTeamInformation;
	const ownEmail = ctx.oidc.user?.email;
	if (
		optsIn &&
		(!ownEmail || normalizeEmailAddress(ownEmail) !== normalizeEmailAddress(args.email))
	) {
		throw apiError({ code: 'FORBIDDEN', message: m.userNewsletterOnlyOwn() });
	}
}

/**
 * Matches the User rows `actor` may impersonate. A system admin: anybody but themselves. Participant care and project
 * management: the participants (delegates, single participants, supervisors) of their conferences,
 * except anybody on a team - impersonating them would lend the actor a team role, possibly of
 * another conference, they were never given - and anybody with a part in (or a place on the
 * waiting list of) a conference the actor does not look after: the impersonation acts as them
 * everywhere, so it would reach into that conference too. The roles of the OIDC claim cannot be
 * lent: while impersonating, the context keeps only the roles both hold (`#api/context`).
 */
function impersonatableBy(actor: { sub: string; isAdmin: boolean }) {
	const notSelf = { id: { ne: actor.sub } };
	if (actor.isAdmin) return notSelf;
	const caredFor = {
		teamMembers: { user: { id: actor.sub }, role: { in: [...PARTICIPANT_CARE_ROLES] } }
	};
	const elsewhere = { conference: { NOT: caredFor } };
	return {
		...notSelf,
		...participatesIn(caredFor),
		AND: [
			{ NOT: { teamMember: true } },
			{ NOT: { conferenceParticipants: elsewhere } },
			{ NOT: { waitingListEntry: elsewhere } }
		]
	};
}

/**
 * Loads the user `targetId` with their identity if `actor` may impersonate them
 * (`impersonatableBy`); undefined otherwise.
 */
function impersonatableUser({
	actor,
	targetId
}: {
	actor: { sub: string; isAdmin: boolean };
	targetId: string;
}) {
	return db.query.user.findFirst({
		where: { AND: [{ id: targetId }, impersonatableBy(actor)] },
		columns: {
			id: true,
			email: true,
			givenName: true,
			familyName: true,
			preferredUsername: true,
			locale: true,
			phone: true
		}
	});
}

/**
 * Whether the caller may start impersonating `targetId`: signed in as themselves (not impersonating
 * somebody already) and allowed to by `impersonatableBy`.
 */
export async function canImpersonate({ ctx, targetId }: { ctx: Context; targetId: string }) {
	const caller = ctx.oidc.user;
	if (!caller || ctx.oidc.impersonator) return false;
	return !!(await impersonatableUser({
		actor: { sub: caller.sub, isAdmin: isSystemAdmin(ctx) },
		targetId
	}));
}

/**
 * Refuses (FORBIDDEN) unless `canImpersonate`, saying so when the caller already impersonates.
 * Returns the caller's id, who acts as the target.
 */
export async function assertCanImpersonate({ ctx, targetId }: { ctx: Context; targetId: string }) {
	const actor = ctx.mustBeLoggedIn();
	if (ctx.oidc.impersonator) {
		throw apiError({ code: 'FORBIDDEN', message: m.impersonationAlreadyActive() });
	}
	if (!(await canImpersonate({ ctx, targetId }))) {
		throw apiError({ code: 'FORBIDDEN', message: m.impersonationForbidden() });
	}
	return { actorId: actor.sub };
}

/**
 * Re-checks a running impersonation on every request: ends it when the impersonator may no longer
 * hold it (they left the target's conference team, the target joined a team, lost the conference
 * or their row), and otherwise loads who the impersonated user is, which the exchanged token may
 * not say (`locals.impersonatedIdentity`).
 * The OIDC library has already checked that the impersonation belongs to this session.
 */
async function checkImpersonation({
	event,
	session,
	impersonator
}: {
	event: RequestEvent;
	session: OIDCSession;
	impersonator: OIDCSession;
}) {
	const actor = {
		sub: impersonator.user.sub,
		isAdmin: rolesOfSession(impersonator).includes('admin')
	};
	const target = await impersonatableUser({ actor, targetId: session.user.sub });
	if (!target) {
		OIDC.stopImpersonation(event);
		logger.info('Impersonation revoked', { actor: actor.sub, subject: session.user.sub });
		return;
	}
	event.locals.impersonatedIdentity = {
		email: target.email,
		given_name: target.givenName,
		family_name: target.familyName,
		preferred_username: target.preferredUsername,
		locale: target.locale,
		phone: target.phone ?? undefined
	};
}

/** The hook that runs `checkImpersonation` for every request made while impersonating. */
export const impersonationHandle: Handle = async ({ event, resolve }) => {
	const session = event.locals.oidc;
	if (session?.impersonator)
		await checkImpersonation({ event, session, impersonator: session.impersonator });
	return resolve(event);
};

/**
 * Whether the caller may see how many conferences the user `id` took part in: they themselves, and
 * whoever has them in their care (`isCaredForUser`: participant care and project management of a
 * conference they take part or wait in, system admins). Others who read the user, such as
 * co-delegates or paper reviewers, would learn something about the person they have no need for.
 */
export async function canReadParticipationCount({ ctx, id }: { ctx: Context; id: string }) {
	if (callerUserId(ctx) === id) return true;
	const caredFor = await caredForUser(ctx);
	if (!caredFor) return false;
	const user = await db.query.user.findFirst({
		where: { id, ...caredFor },
		columns: { id: true }
	});
	return !!user;
}
