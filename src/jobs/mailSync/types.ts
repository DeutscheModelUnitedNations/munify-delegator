// The user rows the sync reads are typed by the query that loads them, which lives apart in
// ./mailSyncUsers so that importing these types does not open a database connection.
import type { MailSyncUser } from './mailSyncUsers';

export type { MailSyncUser };

// List types live with the table that records the lists (`#api/db/schema/mailSync`).
export {
	GLOBAL_LIST_TYPES,
	CONFERENCE_LIST_TYPES,
	type GlobalListType,
	type ConferenceListType
} from '#api/db/schema/mailSync';

/**
 * Which list a rule means: built from ids (`listKey` in ./listNames), never from the list's name,
 * which follows the conference title.
 */
export type ListKey = `${string}:${string}`;

/** The lists the sync manages: the Listmonk id behind each key, and all of them as a set. */
export interface ManagedLists {
	idOf: Map<ListKey, number>;
	ids: Set<number>;
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
			| 'CONTENT_LEAD'
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
	listKeys: ListKey[];
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
		listKeys: ListKey[];
		conferenceAttribs: SubscriberAttribs['conferences'];
	};
}
