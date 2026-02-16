import type {
	User as BaseUser,
	Conference,
	ConferenceSupervisor,
	Delegation,
	DelegationMember,
	SingleParticipant,
	TeamMember
} from '@prisma/client';

// List type constants

export const GLOBAL_LIST_TYPES = ['DMUN_NEWSLETTER', 'DMUN_TEAM_TENDERS'] as const;

export const CONFERENCE_LIST_TYPES = [
	'REGISTRATION_NOT_COMPLETED',
	'REGISTRATION_COMPLETED',
	'REJECTED_PARTICIPANTS',
	'DELEGATION_MEMBERS_NATIONS',
	'DELEGATION_MEMBERS_NSA',
	'SINGLE_PARTICIPANTS',
	'HEAD_DELEGATES',
	'SUPERVISORS',
	'SUPERVISORS_REGISTRATION_NOT_COMPLETED',
	'TEAM'
] as const;

export type GlobalListType = (typeof GLOBAL_LIST_TYPES)[number];
export type ConferenceListType = (typeof CONFERENCE_LIST_TYPES)[number];

// User type with all relations needed for mail sync

export interface MailSyncUser extends BaseUser {
	delegationMemberships: (DelegationMember & {
		delegation: Delegation & {
			conference: Conference;
		};
	})[];
	singleParticipant: (SingleParticipant & {
		conference: Conference;
	})[];
	conferenceSupervisor: (ConferenceSupervisor & {
		conference: Conference;
		supervisedDelegationMembers: (DelegationMember & { delegation: Delegation })[];
		supervisedSingleParticipants: SingleParticipant[];
	})[];
	teamMember: (TeamMember & {
		conference: Conference;
	})[];
}

// Listmonk subscriber as returned by the API

export interface SubscriberAttribs {
	userId: string;
	conferences: {
		id: string;
		title: string;
		role:
			| 'DELEGATE_NATION'
			| 'DELEGATE_NSA'
			| 'SINGLE_PARTICIPANT'
			| 'SUPERVISOR'
			| 'PARTICIPANT_CARE'
			| 'PROJECT_MANAGEMENT'
			| 'MEMBER'
			| 'REVIEWER'
			| 'TEAM_COORDINATOR'
			| undefined;
	}[];
}

export interface ListAtSubscriber {
	subscription_status: string;
	id: number;
	uuid: string;
	name: string;
	type: string;
	tags: string[];
	created_at: string;
	updated_at: string;
}

export interface ListmonkSubscriber {
	id: number;
	created_at: string;
	updated_at: string;
	uuid: string;
	email: string;
	name: string;
	attribs: SubscriberAttribs;
	status: string;
	lists: ListAtSubscriber[];
}

// Computed desired state for a user's subscriber record

export interface ComputedSubscriberState {
	email: string;
	formattedName: string;
	listNames: string[];
	attribs: SubscriberAttribs;
}

// Lightweight classification result — stores only identifiers, not full objects

export interface ClassificationResult {
	createEmails: Set<string>;
	updateSubscriberIds: Map<string, number>;
	deleteSubscriberIds: number[];
	upToDate: number;
	skippedNoLists: number;
}

export interface BatchExecutionResult {
	created: number;
	createFailed: number;
	updated: number;
	updateFailed: number;
}

// List assignment rule interface for the plugin system

export interface ListAssignmentRule {
	readonly description: string;
	evaluate(user: MailSyncUser): {
		listNames: string[];
		conferenceAttribs: SubscriberAttribs['conferences'];
	};
}
