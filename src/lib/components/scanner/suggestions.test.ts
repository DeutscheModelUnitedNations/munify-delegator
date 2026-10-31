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
		expect(navigateSuggestions({ key: 'ArrowDown', highlighted: 1, count: 2 })).toEqual({
			highlighted: 0
		});
		expect(navigateSuggestions({ key: 'ArrowUp', highlighted: 0, count: 2 })).toEqual({
			highlighted: 1
		});
		expect(navigateSuggestions({ key: 'ArrowDown', highlighted: -1, count: 2 })).toEqual({
			highlighted: 0
		});
	});
	test('escape closes', () => {
		expect(navigateSuggestions({ key: 'Escape', highlighted: 1, count: 2 })).toEqual({
			highlighted: -1,
			close: true
		});
	});
	test('an empty list or another key is left alone', () => {
		expect(navigateSuggestions({ key: 'ArrowDown', highlighted: -1, count: 0 })).toBeUndefined();
		expect(navigateSuggestions({ key: 'a', highlighted: 0, count: 2 })).toBeUndefined();
	});
});

describe('codeToSubmit', () => {
	test('blank input submits nothing', () =>
		expect(codeToSubmit({ text: '  ', suggestions: people, highlighted: 0 })).toBeUndefined());
	test('the highlighted person wins', () =>
		expect(codeToSubmit({ text: 'ma', suggestions: people, highlighted: 1 })).toBe('b'));
	test('an id is submitted as typed', () => {
		const id = 'x'.repeat(24);
		expect(codeToSubmit({ text: id, suggestions: people, highlighted: -1 })).toBe(id);
	});
	test('else the best match', () =>
		expect(codeToSubmit({ text: 'ma', suggestions: people, highlighted: -1 })).toBe('a'));
	test('no match falls back to the text', () =>
		expect(codeToSubmit({ text: 'ma', suggestions: [], highlighted: -1 })).toBe('ma'));
});
