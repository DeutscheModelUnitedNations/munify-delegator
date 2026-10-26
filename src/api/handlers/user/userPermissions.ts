import { m } from '#lib/paraglide/messages.js';
import { db } from '#api/db/db.js';
import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	PAPER_ROLES,
	PARTICIPANT_CARE_ROLES,
	isManagedUser,
	isSystemAdmin,
	isTeamMemberOf,
	systemAdmin,
	userId,
	where
} from '#api/services/authHelper.js';
import type { Context } from '#api/context.js';
import { apiError } from '#api/services/errors/apiError.js';

/**
 * What of a user's row a reader sees depends on how the reader relates to that row, and rumble
 * masks columns per row: each rule's `columns` apply to the rows that rule matched.
 *
 * - the person themselves: everything but the care team's notes about them;
 * - who looks after them (participant care, project management, admins): everything;
 * - their supervisors: everything but those notes;
 * - teammates: who someone is, plus their phone number - team coordinators: everything but the
 *   care notes;
 * - everybody else who may see the row at all (co-delegates, co-supervisors, reviewers reading an
 *   author): who someone is - name, email, pronouns, birthday for the age checks.
 */
const IDENTITY = {
	id: true,
	createdAt: true,
	updatedAt: true,
	email: true,
	givenName: true,
	familyName: true,
	preferredUsername: true,
	locale: true,
	pronouns: true,
	birthday: true
};
const WITHOUT_CARE_NOTES = { globalNotes: false };

// Participant care sees the other account of a possible duplicate of someone they look after:
// who it is and, while the pair stands (open or confirmed), the care notes on it - the reason the
// pair is shown - but no contact details. A dismissed pair keeps the name only, so the page can
// still list it and the dismissal can be undone; the notes are withheld again.
function duplicateOfManaged(ctx: Context, status: ('OPEN' | 'CONFIRMED' | 'DISMISSED')[]) {
	const managed = isManagedUser(ctx);
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
	const id = userId(ctx);
	return id ? { supervisors: { user: { id } } } : undefined;
}

export function registerUserAbilities() {
	// System admins may do anything to any account.
	abilityBuilder.user.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Users see and edit themselves - but not what the care team noted about them.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { id }, columns: WITHOUT_CARE_NOTES } : undefined;
	});
	abilityBuilder.user.allow('update').when((ctx) => {
		const id = userId(ctx);
		return id ? { where: { id } } : undefined;
	});

	// Project management and participant care see everybody they look after - the participants,
	// waiting-list entrants and team of the conferences they manage - in full.
	abilityBuilder.user.allow('read').when((ctx) => where(isManagedUser(ctx)));

	// The other account of a possible duplicate (see `duplicateOfManaged`).
	abilityBuilder.user.allow('read').when((ctx) => {
		const filter = duplicateOfManaged(ctx, ['OPEN', 'CONFIRMED']);
		return filter ? { where: filter, columns: { ...IDENTITY, globalNotes: true } } : undefined;
	});
	abilityBuilder.user.allow('read').when((ctx) => {
		const filter = duplicateOfManaged(ctx, ['DISMISSED']);
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

	// Team coordinators see their team in full but for the care notes: the team members page lists
	// everybody's address, gender and food preference for planning.
	abilityBuilder.user.allow('read').when((ctx) => {
		const conference = isTeamMemberOf(ctx, ['TEAM_COORDINATOR']);
		return conference
			? { where: { teamMember: { conference } }, columns: WITHOUT_CARE_NOTES }
			: undefined;
	});

	// Team members see each other, phone numbers included.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? {
					where: { teamMember: { conference: { teamMembers: { user: { id } } } } },
					columns: { ...IDENTITY, phone: true }
				}
			: undefined;
	});

	// Delegates see each other.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? {
					where: { delegationMemberships: { delegation: { members: { user: { id } } } } },
					columns: IDENTITY
				}
			: undefined;
	});

	// Participants see their own supervisors.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = userId(ctx);
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
					columns: IDENTITY
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
					columns: IDENTITY
				}
			: undefined;
	});

	// Reviewers and conference management see the authors of the conference's papers. They can read
	// every paper there, and a paper's `author` is non-nullable, so without this a single paper by
	// someone the team member may not otherwise read fails the whole review page.
	abilityBuilder.user.allow('read').when((ctx) => {
		const id = userId(ctx);
		return id
			? {
					where: {
						papers: {
							conference: { teamMembers: { user: { id }, role: { in: [...PAPER_ROLES] } } }
						}
					},
					columns: IDENTITY
				}
			: undefined;
	});
}

/** Refuses unless the caller looks after this user - the care team's edits, not self-service. */
export async function assertCanManageUser(ctx: Context, id: string) {
	ctx.mustBeLoggedIn();
	const managed = isManagedUser(ctx);
	const found = managed
		? await db.query.user.findFirst({ where: { id, ...managed }, columns: { id: true } })
		: undefined;
	if (!found) {
		throw apiError('NOT_FOUND', m.userNotFoundOrNotSupervised());
	}
}

/**
 * The profile update's row, as far as the caller may update it: their own, or any for an admin.
 * Writing through it changes nothing for anybody else, which is how the mutation has always
 * answered a profile it may not touch.
 */
export async function updatableUser(ctx: ApiContext, id: string) {
	return (await ctx.abilities.user.filter('update')).merge({ where: { id } }).sql.where;
}

/**
 * What of a user's participation in one conference the caller may remove, one where-clause per
 * table. Each carries its own ability filter, merged with the conference/user scope, so a caller
 * who may remove one kind of participation but not another removes only what they are allowed to.
 */
export async function deletableParticipation(
	ctx: ApiContext,
	userId: string,
	conferenceId: string
) {
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
 */
export function assertCanUpdateNewsletterPreferences(
	ctx: Context,
	args: {
		email: string;
		wantsToReceiveGeneralInformation?: boolean | null;
		wantsJoinTeamInformation?: boolean | null;
	}
) {
	const optsIn = args.wantsToReceiveGeneralInformation || args.wantsJoinTeamInformation;
	if (optsIn && ctx.oidc.user?.email?.toLowerCase() !== args.email) {
		throw apiError('FORBIDDEN', m.userNewsletterOnlyOwn());
	}
}

/** Participant care, project management (of any conference) and admins may look users up. */
export async function assertCanPreviewUsers(ctx: Context) {
	const caller = ctx.mustBeLoggedIn();
	if (isSystemAdmin(ctx)) return;

	const privileged = await db.query.teamMember.findFirst({
		where: { userId: caller.sub, role: { in: [...PARTICIPANT_CARE_ROLES] } }
	});
	if (!privileged) {
		throw apiError('FORBIDDEN', m.userPreviewForbidden());
	}
}

/** Impersonation is stalled (see `startImpersonation`), so nobody may impersonate. */
export function assertCanImpersonate(): never {
	throw apiError('FORBIDDEN', m.impersonationUnavailable());
}
