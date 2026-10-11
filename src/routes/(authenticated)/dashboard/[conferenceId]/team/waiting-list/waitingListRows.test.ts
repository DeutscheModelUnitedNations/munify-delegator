import { describe, expect, test } from 'vitest';
import { toWaitingListRow, type WaitingListSourceEntry } from './waitingListRows';

const entry: WaitingListSourceEntry = {
	id: 'w1',
	user: {
		id: 'u1',
		givenName: 'Ada',
		familyName: 'Lovelace',
		email: 'ada@example.org',
		phone: '0123',
		city: 'London',
		birthday: new Date('2008-03-20T00:00:00Z'),
		conferenceParticipationsCount: 2
	},
	school: 'School',
	experience: 'Some',
	motivation: 'Lots',
	requests: 'None',
	hidden: false,
	createdAt: '2026-01-02T03:04:05.000Z'
};

const bare: WaitingListSourceEntry = {
	id: 'w2',
	user: {
		id: 'u2',
		givenName: 'Alan',
		familyName: 'Turing',
		email: 'alan@example.org',
		phone: null,
		conferenceParticipationsCount: 0
	},
	hidden: true,
	createdAt: new Date('2026-01-03T00:00:00Z')
};

describe('toWaitingListRow', () => {
	test('maps every column and computes the age at the conference', () => {
		expect(toWaitingListRow(entry, new Date('2026-03-19T00:00:00Z'))).toEqual({
			id: 'w1',
			userId: 'u1',
			createdAt: new Date('2026-01-02T03:04:05.000Z'),
			family_name: 'Lovelace',
			given_name: 'Ada',
			email: 'ada@example.org',
			phone: '0123',
			conferenceAge: 17,
			participationCount: 2,
			city: 'London',
			school: 'School',
			motivation: 'Lots',
			experience: 'Some',
			requests: 'None',
			hidden: false
		});
	});

	test('has no age without a conference start', () => {
		expect(toWaitingListRow(entry, undefined).conferenceAge).toBeUndefined();
		expect(toWaitingListRow(entry, null).conferenceAge).toBeUndefined();
	});

	test('fills missing optional fields with null and has no age without a birthday', () => {
		expect(toWaitingListRow(bare, '2026-03-19')).toMatchObject({
			phone: null,
			city: null,
			school: null,
			motivation: null,
			experience: null,
			requests: null,
			conferenceAge: undefined,
			hidden: true
		});
	});
});
