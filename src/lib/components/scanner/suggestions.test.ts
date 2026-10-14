import { describe, expect, test } from 'vitest';
import { codeToSubmit, looksLikeUserId, navigateSuggestions, takesPart } from './suggestions';

const people = [
	{ id: 'a', name: 'A', email: 'a@x.de', inConference: true },
	{ id: 'b', name: 'B', email: 'b@x.de', inConference: false }
];
const none = {
	delegationMemberships: [],
	singleParticipant: null,
	conferenceSupervisor: null,
	teamMember: null,
	waitingListEntry: null
};

describe('looksLikeUserId', () => {
	test('long text without spaces is an id', () => {
		expect(looksLikeUserId('x'.repeat(24))).toBe(true);
		expect(looksLikeUserId('Max Mustermann')).toBe(false);
		expect(looksLikeUserId('x'.repeat(10))).toBe(false);
	});
});

describe('takesPart', () => {
	test('nothing held', () => expect(takesPart(none)).toBe(false));
	test.each([
		{ delegationMemberships: [{}] },
		{ singleParticipant: {} },
		{ conferenceSupervisor: {} },
		{ teamMember: {} },
		{ waitingListEntry: {} }
	])('any single part counts: %o', (part) => {
		expect(takesPart({ ...none, ...part })).toBe(true);
	});
});

describe('navigateSuggestions', () => {
	test('arrows wrap around', () => {
		expect(navigateSuggestions('ArrowDown', 1, 2)).toEqual({ highlighted: 0 });
		expect(navigateSuggestions('ArrowUp', 0, 2)).toEqual({ highlighted: 1 });
		expect(navigateSuggestions('ArrowDown', -1, 2)).toEqual({ highlighted: 0 });
	});
	test('escape closes', () => {
		expect(navigateSuggestions('Escape', 1, 2)).toEqual({ highlighted: -1, close: true });
	});
	test('an empty list or another key is left alone', () => {
		expect(navigateSuggestions('ArrowDown', -1, 0)).toBeUndefined();
		expect(navigateSuggestions('a', 0, 2)).toBeUndefined();
	});
});

describe('codeToSubmit', () => {
	test('blank input submits nothing', () => expect(codeToSubmit('  ', people, 0)).toBeUndefined());
	test('the highlighted person wins', () => expect(codeToSubmit('ma', people, 1)).toBe('b'));
	test('an id is submitted as typed', () => {
		const id = 'x'.repeat(24);
		expect(codeToSubmit(id, people, -1)).toBe(id);
	});
	test('else the best match', () => expect(codeToSubmit('ma', people, -1)).toBe('a'));
	test('no match falls back to the text', () => expect(codeToSubmit('ma', [], -1)).toBe('ma'));
});
