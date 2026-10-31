import { m } from '#lib/paraglide/messages';
import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PAPER_ROLES,
	PARTICIPANT_CARE_ROLES,
	TEAM_ADMIN_ROLES,
	isCaredForUser,
	isSystemAdmin,
	isTeamMemberOf,
	participatesIn,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId, grantWhere } from '#api/services/authHelper/utils';
import type { RequestEvent } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import type { OIDCSession } from '@m1212e/sveltekit-oidc';
import { rolesOfSession, type Context } from '#api/context';
import { OIDC } from '#api/services/oidc/OIDC';
import { logger } from '#lib/logger';
import { apiError } from '#api/services/errors';

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

// Participant care sees the other account of a possible duplicate of someone they look after:
// who it is and, while the pair stands (open or confirmed), the care notes on it - the reason the
// pair is shown - but no contact details. A dismissed pair keeps the name only, so the page can
// still list it and the dismissal can be undone; the notes are withheld again.
function duplicateOfManaged({
	ctx,
	status
}: {
	ctx: Context;
	status: ('OPEN' | 'CONFIRMED' | 'DISMISSED')[];
}) {
	const managed = isCaredForUser(ctx);
	if (!managed) return undefined;
	const standing = { status: { in: status } };
	return {
		OR: [
			{ duplicatesAsUser: { ...standing, candidate: managed } },
			{ duplicatesAsCandidate: { ...standing, user: managed } }
		]
	};
}

/** A delegation membership or single participation the caller supervises. */
function supervisedByCaller(ctx: Context) {
	const id = callerUserId(ctx);
	return id ? { supervisors: { user: { id } } } : undefined;
}

export function registerUserAbilities() {
	// System admins may do anything to any account.
	abilityBuilder.user.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see and edit themselves - but not what the care team noted about them.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { id }, columns: WITHOUT_CARE_NOTES } : undefined;
	});
	abilityBuilder.user.allow('update').when((ctx) => {
		const id = callerUserId(ctx);
		return id ? { where: { id } } : undefined;
	});

	// Project management and participant care see everybody they look after - the participants and
	// waiting-list entrants of the conferences they manage - in full.
	abilityBuilder.user.allow('read').when((ctx) => grantWhere(isCaredForUser(ctx)));

	// The other account of a possible duplicate (see `duplicateOfManaged`).
	abilityBuilder.user.allow('read').when((ctx) => {
		const filter = duplicateOfManaged({ ctx, status: ['OPEN', 'CONFIRMED'] });
		return filter ? { where: filter, columns: { ...IDENTITY, globalNotes: true } } : undefined;
	});
	abilityBuilder.user.allow('read').when((ctx) => {
		const filter = duplicateOfManaged({ ctx, status: ['DISMISSED'] });
		return filter ? { where: filter, columns: IDENTITY } : undefined;
	});

	// Supervisors see the participants they supervise, contact details included.
	abilityBuilder.user.allow('read').when((ctx) => {
		const supervised = supervisedByCaller(ctx);
		return supervised
			? {
					where: { OR: [{ delegationMemberships: supervised }, { singleParticipant: supervised }] },
					columns: WITHOUT_CARE_NOTES
				}
			: undefined;
	});

	// Team admins see their team in full but for the care notes: the team members page lists
	// everybody's address, gender and food preference for planning.
	abilityBuilder.user.allow('read').when((ctx) => {
		const conference = isTeamMemberOf({ ctx, roles: TEAM_ADMIN_ROLES });
		return conference
			? { where: { teamMember: { conference } }, columns: WITHOUT_CARE_NOTES }
			: undefined;
	});

	// Team members see each other, phone numbers included.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: { teamMember: { conference: { teamMembers: { user: { id } } } } },
					columns: { ...IDENTITY, phone: true }
				}
			: undefined;
	});

	// Delegates see each other's names and email addresses, to get in touch.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: { delegationMemberships: { delegation: { members: { user: { id } } } } },
					columns: NAME_AND_EMAIL
				}
			: undefined;
	});

	// Participants see their own supervisors.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						conferenceSupervisor: {
							OR: [
								{ supervisedDelegationMembers: { user: { id } } },
								{ supervisedSingleParticipants: { user: { id } } }
							]
						}
					},
					columns: NAME_AND_EMAIL
				}
			: undefined;
	});

	// Supervisors see the other supervisors of the participants they share.
	abilityBuilder.user.allow('read').when((ctx) => {
		const supervised = supervisedByCaller(ctx);
		return supervised
			? {
					where: {
						conferenceSupervisor: {
							OR: [
								{ supervisedDelegationMembers: supervised },
								{ supervisedSingleParticipants: supervised }
							]
						}
					},
					columns: NAME_AND_EMAIL
				}
			: undefined;
	});

	// Reviewers and conference management see the authors of the conference's papers. They can read
	// every paper there, and a paper's `author` is non-nullable, so without this a single paper by
	// someone the team member may not otherwise read fails the whole review page.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						papers: {
							conference: { teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } } }
						}
					},
					columns: NAME
				}
			: undefined;
	});

	// Authors see who reviewed their papers, by name only. A review's `reviewer` is non-nullable,
	// so without this the paper's history fails for an author whose reviewer they cannot otherwise
	// read.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		return id
			? {
					where: {
						paperReviews: { paperVersion: { paper: { authorParticipant: { userId: id } } } }
					},
					columns: { id: true, givenName: true, familyName: true }
				}
			: undefined;
	});
}

/** Refuses unless the caller looks after this user - the care team's edits, not self-service. */
export async function assertCanManageUser({ ctx, id }: { ctx: Context; id: string }) {
	ctx.mustBeLoggedIn();
	const managed = isCaredForUser(ctx);
	const found = managed
		? await db.query.user.findFirst({ where: { id, ...managed }, columns: { id: true } })
		: undefined;
	if (!found) {
		throw apiError({ code: 'NOT_FOUND', message: m.userNotFoundOrNotSupervised() });
	}
}

/**
 * What of a user's participation in one conference the caller may remove, one where-clause per
 * table. Each carries its own ability filter, merged with the conference/user scope, so a caller
 * who may remove one kind of participation but not another removes only what they are allowed to.
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
 * Opting out of the newsletters works without a session, because this backs the unsubscribe link
 * in outgoing mail; opting in is consent, so only the account itself may give it.
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
	if (optsIn && ctx.oidc.user?.email?.toLowerCase() !== args.email) {
		throw apiError({ code: 'FORBIDDEN', message: m.userNewsletterOnlyOwn() });
	}
}

/**
 * Whom `actor` may impersonate. A system admin: anybody but themselves. Participant care and project
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
 * The user `targetId` with what the app shows of their identity, if `actor` may impersonate them
 * as `impersonatableBy` defines it.
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

/** Refuses unless `canImpersonate`. */
export async function assertCanImpersonate({ ctx, targetId }: { ctx: Context; targetId: string }) {
	ctx.mustBeLoggedIn();
	if (ctx.oidc.impersonator) {
		throw apiError({ code: 'FORBIDDEN', message: m.impersonationAlreadyActive() });
	}
	if (!(await canImpersonate({ ctx, targetId }))) {
		throw apiError({ code: 'FORBIDDEN', message: m.impersonationForbidden() });
	}
}

/**
 * Ends an impersonation the impersonator may no longer hold - they left the target's conference
 * team, the target joined a team, lost the conference or their row - and otherwise loads who the
 * impersonated user is, which the exchanged token may not say (`locals.impersonatedIdentity`).
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

export const impersonationHandle: Handle = async ({ event, resolve }) => {
	const session = event.locals.oidc;
	if (session?.impersonator)
		await checkImpersonation({ event, session, impersonator: session.impersonator });
	return resolve(event);
};
