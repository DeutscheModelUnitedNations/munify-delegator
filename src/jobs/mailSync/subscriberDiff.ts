import deepEquals from '../helper/deepEquals';
import { computeSubscriberState } from './listRules';
import type {
	MailSyncUser,
	ListmonkSubscriber,
	ComputedSubscriberState,
	ManagedLists,
	SubscriberAction,
	SubscriberPatch,
	SyncPlan
} from './types';

/**
 * Pass 1 of the sync: compare the desired state with Listmonk and decide what to do.
 *
 * Listmonk is shared with other systems (the DMUN member hub keeps its own lists there), and a
 * person can be on lists of both. The plan therefore only ever touches what belongs to the
 * delegator:
 *
 * - **Lists** are added and removed one by one, and only lists the sync manages (`ManagedLists`,
 *   known by id from `mailing_list`).
 *   Lists of other systems stay where they are, whatever the subscriber's other lists look like.
 * - **Attribs**: only our own keys (`userId`, `conferences`) are compared and written. Listmonk's
 *   PATCH merges keys, so keys of other systems survive.
 * - **Name**: set on create, and kept up to date only while the subscriber is on no foreign list.
 *   Otherwise the other system owns it; two systems formatting the same name differently would
 *   overwrite each other on every run.
 * - **Subscribers are never deleted here.** One nobody claims anymore is released: removed from our
 *   lists, our attribs set to `null`. Deleting subscribers that are left without any list is a
 *   separate, shared step (`collectGarbage`), because only then is it certain nobody else needs
 *   them.
 *
 * Everything in this file is pure, the API calls live in `subscriberActions.ts`.
 */

function ownAttribsMatch({
	subscriber,
	state
}: {
	subscriber: ListmonkSubscriber;
	state: ComputedSubscriberState;
}) {
	return (
		deepEquals({ a: subscriber.attribs?.userId, b: state.attribs.userId }) &&
		deepEquals({ a: subscriber.attribs?.conferences, b: state.attribs.conferences })
	);
}

function hasOwnAttribs(subscriber: ListmonkSubscriber) {
	return subscriber.attribs?.userId != null || subscriber.attribs?.conferences != null;
}

/** The attribs and name to write, if either is out of date. */
function patchFor({
	subscriber,
	state,
	managedIds
}: {
	subscriber: ListmonkSubscriber;
	state: ComputedSubscriberState;
	managedIds: Set<number>;
}): SubscriberPatch | undefined {
	const hasForeignLists = subscriber.lists.some((l) => !managedIds.has(l.id));
	const nameOutdated = !hasForeignLists && subscriber.name !== state.formattedName;
	if (!nameOutdated && ownAttribsMatch({ subscriber, state })) return undefined;

	return {
		...(nameOutdated && { name: state.formattedName }),
		attribs: { userId: state.attribs.userId, conferences: state.attribs.conferences }
	};
}

/** What to do for a user who should be on at least one list. */
export function planForUser({
	state,
	subscriber,
	lists
}: {
	state: ComputedSubscriberState;
	subscriber: ListmonkSubscriber | undefined;
	lists: ManagedLists;
}): SubscriberAction | undefined {
	const desiredIds = new Set(
		state.listKeys.map((key) => lists.idOf.get(key)).filter((id): id is number => id !== undefined)
	);

	if (!subscriber) {
		if (desiredIds.size === 0) return undefined;
		return {
			kind: 'create',
			userId: state.attribs.userId,
			email: state.email,
			name: state.formattedName,
			attribs: state.attribs,
			listIds: [...desiredIds]
		};
	}

	const currentIds = new Set(subscriber.lists.filter((l) => lists.ids.has(l.id)).map((l) => l.id));
	const addListIds = [...desiredIds].filter((id) => !currentIds.has(id));
	const removeListIds = [...currentIds].filter((id) => !desiredIds.has(id));
	const patch = patchFor({ subscriber, state, managedIds: lists.ids });

	if (addListIds.length === 0 && removeListIds.length === 0 && !patch) return undefined;

	return { kind: 'update', subscriberId: subscriber.id, addListIds, removeListIds, patch };
}

/** What to do with a subscriber no user claims anymore: take back what is ours, leave the rest. */
export function planRelease({
	subscriber,
	managedIds
}: {
	subscriber: ListmonkSubscriber;
	managedIds: Set<number>;
}): SubscriberAction | undefined {
	const removeListIds = subscriber.lists.filter((l) => managedIds.has(l.id)).map((l) => l.id);
	const ownAttribs = hasOwnAttribs(subscriber);

	if (removeListIds.length === 0 && !ownAttribs) return undefined;

	return {
		kind: 'update',
		subscriberId: subscriber.id,
		addListIds: [],
		removeListIds,
		patch: ownAttribs ? { attribs: { userId: null, conferences: null } } : undefined
	};
}

/**
 * Plans a batch of users. Every subscriber that is matched to a user is taken out of the map, so
 * that after the last batch the map holds exactly the subscribers no user claims.
 */
export function planUserBatch({
	users,
	subscriberMap,
	lists,
	plan,
	cutoff
}: {
	users: MailSyncUser[];
	subscriberMap: Map<string, ListmonkSubscriber>;
	lists: ManagedLists;
	plan: SyncPlan;
	cutoff: Date;
}): void {
	for (const user of users) {
		const state = computeSubscriberState({ user, cutoff });

		// Users without lists stay in the map and are released below like any unclaimed subscriber.
		if (state.listKeys.length === 0) {
			plan.skippedNoLists++;
			continue;
		}

		const emailKey = state.email.toLowerCase();
		const subscriber = subscriberMap.get(emailKey);
		subscriberMap.delete(emailKey);

		const action = planForUser({ state, subscriber, lists });
		if (action) {
			plan.userActions.push(action);
		} else {
			plan.upToDate++;
		}
	}
}

/** Releases every subscriber left in the map after all users have been planned. */
export function planReleases({
	subscriberMap,
	lists,
	plan
}: {
	subscriberMap: Map<string, ListmonkSubscriber>;
	lists: ManagedLists;
	plan: SyncPlan;
}) {
	for (const subscriber of subscriberMap.values()) {
		const action = planRelease({ subscriber, managedIds: lists.ids });
		if (action) plan.releases.push(action);
	}
}
