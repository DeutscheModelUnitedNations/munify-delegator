import type { Prisma } from '@prisma/client';

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

// Prisma query args for fetching only the fields needed by computeSubscriberState().
// Avoids loading large Conference fields (data URL images, legal documents)
// that cause ~5-13 MB per user in memory.

const conferenceSelect = {
	select: { id: true, title: true, state: true }
} as const;

export const mailSyncUserArgs = {
	select: {
		id: true,
		email: true,
		given_name: true,
		family_name: true,
		wantsToReceiveGeneralInformation: true,
		wantsJoinTeamInformation: true,
		delegationMemberships: {
			select: {
				conferenceId: true,
				isHeadDelegate: true,
				delegation: {
					select: {
						applied: true,
						assignedNationAlpha3Code: true,
						assignedNonStateActorId: true,
						conference: conferenceSelect
					}
				}
			}
		},
		singleParticipant: {
			select: {
				conferenceId: true,
				applied: true,
				assignedRoleId: true,
				conference: conferenceSelect
			}
		},
		conferenceSupervisor: {
			select: {
				conferenceId: true,
				conference: conferenceSelect,
				supervisedDelegationMembers: {
					select: {
						delegation: {
							select: {
								applied: true,
								assignedNationAlpha3Code: true,
								assignedNonStateActorId: true
							}
						}
					}
				},
				supervisedSingleParticipants: {
					select: {
						applied: true,
						assignedRoleId: true
					}
				}
			}
		},
		teamMember: {
			select: {
				conferenceId: true,
				role: true,
				conference: conferenceSelect
			}
		}
	}
} as const satisfies Prisma.UserDefaultArgs;

export type MailSyncUser = Prisma.UserGetPayload<typeof mailSyncUserArgs>;

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
	attribs: StoredAttribs;
	status: string;
	lists: ListAtSubscriber[];
}

/**
 * Attribs as found in Listmonk. Other systems (e.g. the DMUN member hub) write their own
 * top-level keys next to ours, and a released subscriber keeps our keys with `null` values
 * because PATCH can only merge keys, not remove them.
 */
export type StoredAttribs = {
	[K in keyof SubscriberAttribs]?: SubscriberAttribs[K] | null;
} & Record<string, unknown>;

// Computed desired state for a user's subscriber record

export interface ComputedSubscriberState {
	email: string;
	formattedName: string;
	listNames: string[];
	attribs: SubscriberAttribs;
}

// What the sync is going to do with one subscriber. Planned in pass 1, executed in pass 2.

export interface SubscriberPatch {
	name?: string;
	attribs: Record<string, unknown>;
}

export type SubscriberAction =
	| {
			kind: 'create';
			userId: string;
			email: string;
			name: string;
			attribs: SubscriberAttribs;
			listIds: number[];
	  }
	| {
			kind: 'update';
			subscriberId: number;
			/** Only lists we manage. Lists of other systems are never touched. */
			addListIds: number[];
			removeListIds: number[];
			patch: SubscriberPatch | undefined;
	  };

export interface SyncPlan {
	/** Users that got a new subscriber or a changed one. */
	userActions: SubscriberAction[];
	/** Subscribers no user claims anymore: our lists and attribs are removed from them. */
	releases: SubscriberAction[];
	upToDate: number;
	skippedNoLists: number;
}

export interface PlanExecutionResult {
	succeeded: number;
	failed: number;
}

// List assignment rule interface for the plugin system

export interface ListAssignmentRule {
	readonly description: string;
	evaluate(user: MailSyncUser): {
		listNames: string[];
		conferenceAttribs: SubscriberAttribs['conferences'];
	};
}
