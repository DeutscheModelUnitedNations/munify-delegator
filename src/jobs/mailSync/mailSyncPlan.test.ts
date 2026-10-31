import { describe, expect, test } from 'vitest';
import { planForUser, planRelease } from './subscriberDiff';
import type {
	ComputedSubscriberState,
	ListAtSubscriber,
	ListKey,
	ListmonkSubscriber,
	ManagedLists
} from './types';

const TEAM: ListKey = 'V1St-_x:TEAM';
const NEWSLETTER: ListKey = 'global:DMUN_NEWSLETTER';
const FOREIGN = '[DMUN-Intern] Rundbrief';
/** A list of another system that happens to be named like one of ours. */
const LOOKALIKE = '[V1St-_] MUN-SH 2026 - TEAM';

const idOf = new Map<ListKey, number>([
	[TEAM, 1],
	[NEWSLETTER, 2]
]);
const lists: ManagedLists = { idOf, ids: new Set(idOf.values()) };

function list(id: number, name: string): ListAtSubscriber {
	return {
		id,
		name,
		subscription_status: 'confirmed',
		uuid: '',
		type: 'private',
		tags: [],
		created_at: '',
		updated_at: ''
	};
}

function subscriber(overrides: Partial<ListmonkSubscriber> = {}): ListmonkSubscriber {
	return {
		id: 42,
		created_at: '',
		updated_at: '',
		uuid: '',
		email: 'erika@example.org',
		name: 'Erika Mustermann',
		status: 'enabled',
		attribs: { userId: 'u1', conferences: [] },
		lists: [],
		...overrides
	};
}

function state(listKeys: ListKey[]): ComputedSubscriberState {
	return {
		email: 'erika@example.org',
		formattedName: 'Erika Mustermann',
		listKeys,
		attribs: { userId: 'u1', conferences: [] }
	};
}

describe('planForUser', () => {
	test('creates a missing subscriber with all desired lists', () => {
		expect(planForUser({ state: state([TEAM, NEWSLETTER]), subscriber: undefined, lists })).toEqual(
			{
				kind: 'create',
				userId: 'u1',
				email: 'erika@example.org',
				name: 'Erika Mustermann',
				attribs: { userId: 'u1', conferences: [] },
				listIds: [1, 2]
			}
		);
	});

	test('does nothing when our lists, name and attribs match', () => {
		const sub = subscriber({ lists: [list(1, 'Team')] });
		expect(planForUser({ state: state([TEAM]), subscriber: sub, lists })).toBeUndefined();
	});

	test('adds and removes only the difference on our lists', () => {
		const sub = subscriber({ lists: [list(2, 'Newsletter')] });
		expect(planForUser({ state: state([TEAM]), subscriber: sub, lists })).toMatchObject({
			kind: 'update',
			addListIds: [1],
			removeListIds: [2],
			patch: undefined
		});
	});

	test('never removes foreign lists and ignores foreign attribs', () => {
		const sub = subscriber({
			lists: [list(1, 'Team'), list(9, FOREIGN)],
			attribs: { userId: 'u1', conferences: [], mitgliedshub: { memberId: 'm1' } }
		});
		expect(planForUser({ state: state([TEAM]), subscriber: sub, lists })).toBeUndefined();
	});

	test('keeps the name while another system shares the subscriber', () => {
		const sub = subscriber({
			name: 'Dr. Erika Mustermann',
			lists: [list(1, 'Team'), list(9, FOREIGN)]
		});
		expect(planForUser({ state: state([TEAM]), subscriber: sub, lists })).toBeUndefined();
	});

	test('updates the name of a subscriber that is ours alone', () => {
		const sub = subscriber({ name: 'E. Mustermann', lists: [list(1, 'Team')] });
		expect(planForUser({ state: state([TEAM]), subscriber: sub, lists })).toMatchObject({
			patch: { name: 'Erika Mustermann', attribs: { userId: 'u1', conferences: [] } }
		});
	});

	test('writes only our attrib keys', () => {
		const sub = subscriber({
			lists: [list(1, 'Team')],
			attribs: { userId: 'old', mitgliedshub: { memberId: 'm1' } }
		});
		const action = planForUser({ state: state([TEAM]), subscriber: sub, lists });
		expect(action).toMatchObject({ patch: { attribs: { userId: 'u1', conferences: [] } } });
		expect(action?.kind === 'update' && action.patch?.attribs).not.toHaveProperty('mitgliedshub');
	});

	test('treats a foreign list named like one of ours as foreign', () => {
		const sub = subscriber({
			name: 'Dr. Erika Mustermann',
			lists: [list(1, 'Team'), list(9, LOOKALIKE)]
		});
		expect(planForUser({ state: state([NEWSLETTER]), subscriber: sub, lists })).toMatchObject({
			addListIds: [2],
			removeListIds: [1],
			patch: undefined
		});
	});
});

describe('planRelease', () => {
	test('takes back our lists and attribs, leaves foreign lists', () => {
		const sub = subscriber({ lists: [list(1, 'Team'), list(9, FOREIGN)] });
		expect(planRelease({ subscriber: sub, managedIds: lists.ids })).toEqual({
			kind: 'update',
			subscriberId: 42,
			addListIds: [],
			removeListIds: [1],
			patch: { attribs: { userId: null, conferences: null } }
		});
	});

	test('does nothing for a subscriber that was never ours', () => {
		const sub = subscriber({
			lists: [list(9, FOREIGN), list(10, LOOKALIKE)],
			attribs: { mitgliedshub: { memberId: 'm1' } }
		});
		expect(planRelease({ subscriber: sub, managedIds: lists.ids })).toBeUndefined();
	});

	test('does nothing for a subscriber that was already released', () => {
		const sub = subscriber({ attribs: { userId: null, conferences: null } });
		expect(planRelease({ subscriber: sub, managedIds: lists.ids })).toBeUndefined();
	});
});
