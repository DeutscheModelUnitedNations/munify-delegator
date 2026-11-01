import type {
	ConferenceListType,
	MailSyncUser,
	ListAssignmentRule,
	SubscriberAttribs,
	ComputedSubscriberState,
	ListKey
} from './types';
import { globalListKey, conferenceListKey } from './listNames';
import { withinRetention } from './window';
import formatNames from '#lib/helpers/formatNames';

// Rule: Global newsletter subscription

const globalNewsletterRule: ListAssignmentRule = {
	description: 'Assigns users who opted into general information to DMUN_NEWSLETTER',
	evaluate(user) {
		const listKeys: ListKey[] = [];
		if (user.wantsToReceiveGeneralInformation) {
			listKeys.push(globalListKey('DMUN_NEWSLETTER'));
		}
		return { listKeys, conferenceAttribs: [] };
	}
};

// Rule: Global team tenders subscription

const globalTeamTendersRule: ListAssignmentRule = {
	description: 'Assigns users who opted into team information to DMUN_TEAM_TENDERS',
	evaluate(user) {
		const listKeys: ListKey[] = [];
		if (user.wantsJoinTeamInformation) {
			listKeys.push(globalListKey('DMUN_TEAM_TENDERS'));
		}
		return { listKeys, conferenceAttribs: [] };
	}
};

// Rule: Delegation member list assignments

type DelegationMembership = MailSyncUser['delegationMemberships'][number];

/**
 * The lists one delegation membership puts a user on. Until the team releases the assignment,
 * nobody is on a list that tells them what they got - or that they got nothing.
 */
function delegationMemberListTypes(dm: DelegationMembership): ConferenceListType[] {
	const { delegation } = dm;

	if (!delegation.conference.assignmentReleased) {
		return [delegation.applied ? 'REGISTRATION_COMPLETED' : 'REGISTRATION_NOT_COMPLETED'];
	}

	const kind = delegation.assignedRole?.kind;
	const hasRole = Boolean(delegation.assignedRoleId);
	const types: ConferenceListType[] = [];
	if (kind === 'NATION') types.push('DELEGATION_MEMBERS_NATIONS');
	else if (kind === 'NON_STATE_ACTOR') types.push('DELEGATION_MEMBERS_NSA');
	if (dm.isHeadDelegate && hasRole) types.push('HEAD_DELEGATES');
	return [...types, ...releasedRegistrationTypes({ applied: delegation.applied, hasRole })];
}

/** Once assignments are out: who has registered, and who applied without getting a role. */
function releasedRegistrationTypes({
	applied,
	hasRole
}: {
	applied: boolean;
	hasRole: boolean;
}): ConferenceListType[] {
	if (!applied) return ['REGISTRATION_NOT_COMPLETED'];
	return hasRole ? ['REGISTRATION_COMPLETED'] : ['REGISTRATION_COMPLETED', 'REJECTED_PARTICIPANTS'];
}

/** The subscriber role a delegation's role gives its members; a custom role is no delegate's. */
const DELEGATE_ROLES = {
	NATION: 'DELEGATE_NATION',
	NON_STATE_ACTOR: 'DELEGATE_NSA',
	CUSTOM: undefined
} as const;

const delegationMemberRule: ListAssignmentRule = {
	description:
		'Assigns delegation members to NATIONS, NSA, HEAD_DELEGATES, REGISTRATION_*, REJECTED lists',
	evaluate(user) {
		const listKeys: ListKey[] = [];
		const conferenceAttribs: SubscriberAttribs['conferences'] = [];

		for (const dm of user.delegationMemberships) {
			const { conference } = dm.delegation;

			conferenceAttribs.push({
				id: conference.id,
				role: conference.assignmentReleased
					? DELEGATE_ROLES[dm.delegation.assignedRole?.kind ?? 'CUSTOM']
					: undefined,
				title: conference.title
			});

			for (const type of delegationMemberListTypes(dm)) {
				listKeys.push(conferenceListKey({ conferenceId: conference.id, listType: type }));
			}
		}

		return { listKeys, conferenceAttribs };
	}
};

// Rule: Single participant list assignments

const singleParticipantRule: ListAssignmentRule = {
	description: 'Assigns single participants to SINGLE_PARTICIPANTS, REGISTRATION_*, REJECTED lists',
	evaluate(user) {
		const listKeys: ListKey[] = [];
		const conferenceAttribs: SubscriberAttribs['conferences'] = [];

		for (const sp of user.singleParticipant) {
			conferenceAttribs.push({
				id: sp.conference.id,
				role: 'SINGLE_PARTICIPANT',
				title: sp.conference.title
			});

			if (sp.applied) {
				listKeys.push(
					conferenceListKey({ conferenceId: sp.conference.id, listType: 'REGISTRATION_COMPLETED' })
				);

				// Nobody hears whether they got a role before the team releases it.
				if (sp.conference.assignmentReleased) {
					listKeys.push(
						conferenceListKey({
							conferenceId: sp.conference.id,
							listType: sp.assignedRoleId ? 'SINGLE_PARTICIPANTS' : 'REJECTED_PARTICIPANTS'
						})
					);
				}
			} else {
				listKeys.push(
					conferenceListKey({
						conferenceId: sp.conference.id,
						listType: 'REGISTRATION_NOT_COMPLETED'
					})
				);
			}
		}

		return { listKeys, conferenceAttribs };
	}
};

// Rule: Supervisor list assignments

type Supervision = MailSyncUser['conferenceSupervisor'][number];

/**
 * The lists one supervision puts a user on. During registration that depends on whether their
 * participants have applied yet; afterwards, on whether any of them got a role.
 */
function supervisorListTypes(supervisor: Supervision): ConferenceListType[] {
	const delegations = supervisor.supervisedDelegationMembers.map((d) => d.delegation);
	const singles = supervisor.supervisedSingleParticipants;

	if (
		supervisor.conference.state !== 'PARTICIPANT_REGISTRATION' &&
		supervisor.conference.assignmentReleased
	) {
		const anyWithRole =
			delegations.some((d) => d.assignedRoleId) || singles.some((d) => d.assignedRoleId);
		return anyWithRole ? ['SUPERVISORS'] : [];
	}

	const types: ConferenceListType[] = [];
	if (delegations.some((d) => d.applied) || singles.some((d) => d.applied)) {
		types.push('SUPERVISORS');
	}
	if (delegations.some((d) => !d.applied) || singles.some((d) => !d.applied)) {
		types.push('SUPERVISORS_REGISTRATION_NOT_COMPLETED');
	}
	return types;
}

const supervisorRule: ListAssignmentRule = {
	description: 'Assigns supervisors to SUPERVISORS and SUPERVISORS_REGISTRATION_NOT_COMPLETED',
	evaluate(user) {
		const listKeys: ListKey[] = [];
		const conferenceAttribs: SubscriberAttribs['conferences'] = [];

		for (const supervisor of user.conferenceSupervisor) {
			conferenceAttribs.push({
				id: supervisor.conference.id,
				role: 'SUPERVISOR',
				title: supervisor.conference.title
			});

			for (const type of supervisorListTypes(supervisor)) {
				listKeys.push(
					conferenceListKey({ conferenceId: supervisor.conference.id, listType: type })
				);
			}
		}

		return { listKeys, conferenceAttribs };
	}
};

// Rule: Team member list assignments

const teamMemberRule: ListAssignmentRule = {
	description: 'Assigns team members to TEAM + extra lists for PM/PC roles',
	evaluate(user) {
		const listKeys: ListKey[] = [];
		const conferenceAttribs: SubscriberAttribs['conferences'] = [];

		for (const tm of user.teamMember) {
			conferenceAttribs.push({
				id: tm.conferenceId,
				role: tm.role,
				title: tm.conference.title
			});

			listKeys.push(conferenceListKey({ conferenceId: tm.conferenceId, listType: 'TEAM' }));

			if (tm.role === 'PARTICIPANT_CARE' || tm.role === 'PROJECT_MANAGEMENT') {
				listKeys.push(
					conferenceListKey({ conferenceId: tm.conferenceId, listType: 'REGISTRATION_COMPLETED' })
				);
				listKeys.push(
					conferenceListKey({
						conferenceId: tm.conferenceId,
						listType: 'REGISTRATION_NOT_COMPLETED'
					})
				);
				listKeys.push(
					conferenceListKey({ conferenceId: tm.conferenceId, listType: 'SUPERVISORS' })
				);
			}
		}

		return { listKeys, conferenceAttribs };
	}
};

// All rules in evaluation order

const ALL_RULES: readonly ListAssignmentRule[] = [
	globalNewsletterRule,
	globalTeamTendersRule,
	delegationMemberRule,
	singleParticipantRule,
	supervisorRule,
	teamMemberRule
];

/**
 * Computes the desired subscriber state for a user by evaluating all rules.
 * Each rule is evaluated exactly once per user. Conferences that ended before `cutoff` are left
 * out, so their participants drop off their lists (see `window.ts`).
 */
export function computeSubscriberState({
	user,
	cutoff
}: {
	user: MailSyncUser;
	cutoff: Date;
}): ComputedSubscriberState {
	const allListKeys: ListKey[] = [];
	const allConferenceAttribs: SubscriberAttribs['conferences'] = [];
	const recentUser = withinRetention({ user, cutoff });

	for (const rule of ALL_RULES) {
		const { listKeys, conferenceAttribs } = rule.evaluate(recentUser);
		allListKeys.push(...listKeys);
		allConferenceAttribs.push(...conferenceAttribs);
	}

	return {
		email: user.email.trim(),
		formattedName: formatNames({
			givenName: user.givenName ?? undefined,
			familyName: user.familyName ?? undefined,
			options: {
				familyNameUppercase: false
			}
		}),
		listKeys: [...new Set(allListKeys)],
		attribs: {
			userId: user.id,
			conferences: allConferenceAttribs
		}
	};
}
