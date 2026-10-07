import type {
	ConferenceListType,
	MailSyncUser,
	ListAssignmentRule,
	SubscriberAttribs,
	ComputedSubscriberState
} from './types';
import { createGlobalListName, createConferenceListName } from './listNames';
import formatNames from '$lib/helpers/formatNames';

// Rule: Global newsletter subscription

const globalNewsletterRule: ListAssignmentRule = {
	description: 'Assigns users who opted into general information to DMUN_NEWSLETTER',
	evaluate(user) {
		const listNames: string[] = [];
		if (user.wantsToReceiveGeneralInformation) {
			listNames.push(createGlobalListName('DMUN_NEWSLETTER'));
		}
		return { listNames, conferenceAttribs: [] };
	}
};

// Rule: Global team tenders subscription

const globalTeamTendersRule: ListAssignmentRule = {
	description: 'Assigns users who opted into team information to DMUN_TEAM_TENDERS',
	evaluate(user) {
		const listNames: string[] = [];
		if (user.wantsJoinTeamInformation) {
			listNames.push(createGlobalListName('DMUN_TEAM_TENDERS'));
		}
		return { listNames, conferenceAttribs: [] };
	}
};

// Rule: Delegation member list assignments

type DelegationMembership = MailSyncUser['delegationMemberships'][number];

/** The lists one delegation membership puts a user on. */
function delegationMemberListTypes(dm: DelegationMembership): ConferenceListType[] {
	const { delegation } = dm;
	const hasRole = Boolean(
		delegation.assignedNationAlpha3Code || delegation.assignedNonStateActorId
	);
	const types: ConferenceListType[] = [];

	if (delegation.assignedNationAlpha3Code) types.push('DELEGATION_MEMBERS_NATIONS');
	else if (delegation.assignedNonStateActorId) types.push('DELEGATION_MEMBERS_NSA');

	if (dm.isHeadDelegate && hasRole) types.push('HEAD_DELEGATES');

	if (!delegation.applied) types.push('REGISTRATION_NOT_COMPLETED');
	else {
		types.push('REGISTRATION_COMPLETED');
		if (!hasRole) types.push('REJECTED_PARTICIPANTS');
	}
	return types;
}

const delegationMemberRule: ListAssignmentRule = {
	description:
		'Assigns delegation members to NATIONS, NSA, HEAD_DELEGATES, REGISTRATION_*, REJECTED lists',
	evaluate(user) {
		const listNames: string[] = [];
		const conferenceAttribs: SubscriberAttribs['conferences'] = [];

		for (const dm of user.delegationMemberships) {
			const { conference } = dm.delegation;

			conferenceAttribs.push({
				id: dm.conferenceId,
				role: dm.delegation.assignedNationAlpha3Code
					? 'DELEGATE_NATION'
					: dm.delegation.assignedNonStateActorId
						? 'DELEGATE_NSA'
						: undefined,
				title: conference.title
			});

			for (const type of delegationMemberListTypes(dm)) {
				listNames.push(createConferenceListName(conference.title, dm.conferenceId, type));
			}
		}

		return { listNames, conferenceAttribs };
	}
};

// Rule: Single participant list assignments

const singleParticipantRule: ListAssignmentRule = {
	description: 'Assigns single participants to SINGLE_PARTICIPANTS, REGISTRATION_*, REJECTED lists',
	evaluate(user) {
		const listNames: string[] = [];
		const conferenceAttribs: SubscriberAttribs['conferences'] = [];

		for (const sp of user.singleParticipant) {
			conferenceAttribs.push({
				id: sp.conferenceId,
				role: 'SINGLE_PARTICIPANT',
				title: sp.conference.title
			});

			if (sp.applied) {
				listNames.push(
					createConferenceListName(sp.conference.title, sp.conferenceId, 'REGISTRATION_COMPLETED')
				);

				if (sp.assignedRoleId) {
					listNames.push(
						createConferenceListName(sp.conference.title, sp.conferenceId, 'SINGLE_PARTICIPANTS')
					);
				} else {
					listNames.push(
						createConferenceListName(sp.conference.title, sp.conferenceId, 'REJECTED_PARTICIPANTS')
					);
				}
			} else {
				listNames.push(
					createConferenceListName(
						sp.conference.title,
						sp.conferenceId,
						'REGISTRATION_NOT_COMPLETED'
					)
				);
			}
		}

		return { listNames, conferenceAttribs };
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

	if (supervisor.conference.state !== 'PARTICIPANT_REGISTRATION') {
		const anyWithRole =
			delegations.some((d) => d.assignedNationAlpha3Code || d.assignedNonStateActorId) ||
			singles.some((d) => d.assignedRoleId);
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
		const listNames: string[] = [];
		const conferenceAttribs: SubscriberAttribs['conferences'] = [];

		for (const supervisor of user.conferenceSupervisor) {
			conferenceAttribs.push({
				id: supervisor.conferenceId,
				role: 'SUPERVISOR',
				title: supervisor.conference.title
			});

			for (const type of supervisorListTypes(supervisor)) {
				listNames.push(
					createConferenceListName(supervisor.conference.title, supervisor.conferenceId, type)
				);
			}
		}

		return { listNames, conferenceAttribs };
	}
};

// Rule: Team member list assignments

const teamMemberRule: ListAssignmentRule = {
	description: 'Assigns team members to TEAM + extra lists for PM/PC roles',
	evaluate(user) {
		const listNames: string[] = [];
		const conferenceAttribs: SubscriberAttribs['conferences'] = [];

		for (const tm of user.teamMember) {
			conferenceAttribs.push({
				id: tm.conferenceId,
				role: tm.role,
				title: tm.conference.title
			});

			listNames.push(createConferenceListName(tm.conference.title, tm.conferenceId, 'TEAM'));

			if (tm.role === 'PARTICIPANT_CARE' || tm.role === 'PROJECT_MANAGEMENT') {
				listNames.push(
					createConferenceListName(tm.conference.title, tm.conferenceId, 'REGISTRATION_COMPLETED')
				);
				listNames.push(
					createConferenceListName(
						tm.conference.title,
						tm.conferenceId,
						'REGISTRATION_NOT_COMPLETED'
					)
				);
				listNames.push(
					createConferenceListName(tm.conference.title, tm.conferenceId, 'SUPERVISORS')
				);
			}
		}

		return { listNames, conferenceAttribs };
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
 * Each rule is evaluated exactly once per user.
 */
export function computeSubscriberState(user: MailSyncUser): ComputedSubscriberState {
	const allListNames: string[] = [];
	const allConferenceAttribs: SubscriberAttribs['conferences'] = [];

	for (const rule of ALL_RULES) {
		const { listNames, conferenceAttribs } = rule.evaluate(user);
		allListNames.push(...listNames);
		allConferenceAttribs.push(...conferenceAttribs);
	}

	return {
		email: user.email.trim(),
		formattedName: formatNames(user.givenName ?? undefined, user.familyName ?? undefined, {
			familyNameUppercase: false
		}),
		listNames: [...new Set(allListNames)],
		attribs: {
			userId: user.id,
			conferences: allConferenceAttribs
		}
	};
}
