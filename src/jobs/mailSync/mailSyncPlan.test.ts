import { describe, expect, test } from 'vitest';
import { isManagedListName } from './listNames';
import { planForUser, planRelease } from './subscriberDiff';
import type { ComputedSubscriberState, ListAtSubscriber, ListmonkSubscriber } from './types';

const TEAM = '[V1St-_] MUN-SH 2026 - TEAM';
const NEWSLETTER = '[global] DMUN_NEWSLETTER';
const FOREIGN = '[DMUN-Intern] Rundbrief';

const listNameToId = new Map([
	[TEAM, 1],
	[NEWSLETTER, 2]
]);

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

function state(listNames: string[]): ComputedSubscriberState {
	return {
		email: 'erika@example.org',
		formattedName: 'Erika Mustermann',
		listNames,
		attribs: { userId: 'u1', conferences: [] }
	};
}

describe('isManagedListName', () => {
	test('claims global and conference lists, with nanoid prefixes', () => {
		expect(isManagedListName(NEWSLETTER)).toBe(true);
		expect(isManagedListName(TEAM)).toBe(true);
		expect(isManagedListName('[abcdef] X - SUPERVISORS_REGISTRATION_NOT_COMPLETED')).toBe(true);
	});

	test('leaves lists of other systems alone', () => {
		expect(isManagedListName(FOREIGN)).toBe(false);
		expect(isManagedListName('[Alumni] Treffen')).toBe(false);
		expect(isManagedListName('[global] SOMETHING_ELSE')).toBe(false);
		expect(isManagedListName('[V1StGX] X - NOT_A_TYPE')).toBe(false);
	});
});

describe('planForUser', () => {
	test('creates a missing subscriber with all desired lists', () => {
		expect(planForUser(state([TEAM, NEWSLETTER]), undefined, listNameToId)).toEqual({
			kind: 'create',
			userId: 'u1',
			email: 'erika@example.org',
			name: 'Erika Mustermann',
			attribs: { userId: 'u1', conferences: [] },
			listIds: [1, 2]
		});
	});

	test('does nothing when our lists, name and attribs match', () => {
		const sub = subscriber({ lists: [list(1, TEAM)] });
		expect(planForUser(state([TEAM]), sub, listNameToId)).toBeUndefined();
	});

	test('adds and removes only the difference on our lists', () => {
		const sub = subscriber({ lists: [list(2, NEWSLETTER)] });
		expect(planForUser(state([TEAM]), sub, listNameToId)).toMatchObject({
			kind: 'update',
			addListIds: [1],
			removeListIds: [2],
			patch: undefined
		});
	});

	test('never removes foreign lists and ignores foreign attribs', () => {
		const sub = subscriber({
			lists: [list(1, TEAM), list(9, FOREIGN)],
			attribs: { userId: 'u1', conferences: [], mitgliedshub: { memberId: 'm1' } }
		});
		expect(planForUser(state([TEAM]), sub, listNameToId)).toBeUndefined();
	});

	test('keeps the name while another system shares the subscriber', () => {
		const sub = subscriber({
			name: 'Dr. Erika Mustermann',
			lists: [list(1, TEAM), list(9, FOREIGN)]
		});
		expect(planForUser(state([TEAM]), sub, listNameToId)).toBeUndefined();
	});

	test('updates the name of a subscriber that is ours alone', () => {
		const sub = subscriber({ name: 'E. Mustermann', lists: [list(1, TEAM)] });
		expect(planForUser(state([TEAM]), sub, listNameToId)).toMatchObject({
			patch: { name: 'Erika Mustermann', attribs: { userId: 'u1', conferences: [] } }
		});
	});

	test('writes only our attrib keys', () => {
		const sub = subscriber({
			lists: [list(1, TEAM)],
			attribs: { userId: 'old', mitgliedshub: { memberId: 'm1' } }
		});
		const action = planForUser(state([TEAM]), sub, listNameToId);
		expect(action).toMatchObject({ patch: { attribs: { userId: 'u1', conferences: [] } } });
		expect(action?.kind === 'update' && action.patch?.attribs).not.toHaveProperty('mitgliedshub');
	});
});

describe('planRelease', () => {
	test('takes back our lists and attribs, leaves foreign lists', () => {
		const sub = subscriber({ lists: [list(1, TEAM), list(9, FOREIGN)] });
		expect(planRelease(sub)).toEqual({
			kind: 'update',
			subscriberId: 42,
			addListIds: [],
			removeListIds: [1],
			patch: { attribs: { userId: null, conferences: null } }
		});
	});

	test('does nothing for a subscriber that was never ours', () => {
		const sub = subscriber({
			lists: [list(9, FOREIGN)],
			attribs: { mitgliedshub: { memberId: 'm1' } }
		});
		expect(planRelease(sub)).toBeUndefined();
	});

	test('does nothing for a subscriber that was already released', () => {
		const sub = subscriber({ attribs: { userId: null, conferences: null } });
		expect(planRelease(sub)).toBeUndefined();
	});
});
