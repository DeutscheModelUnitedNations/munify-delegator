import { describe, expect, test } from 'vitest';
import { canHideIn, hiddenState } from './hiddenMessages';

describe('hiddenState', () => {
	test('a message nobody hid shows as written', () => {
		expect(hiddenState({ body: 'Hallo', hiddenAt: null })).toBe('visible');
		expect(hiddenState({ body: 'Hallo' })).toBe('visible');
	});

	test("the chat's people read a placeholder: the text does not reach them", () => {
		expect(hiddenState({ body: null, hiddenAt: '2026-11-19T10:00:00Z' })).toBe('placeholder');
	});

	test('participant care reads the text, marked as hidden', () => {
		expect(hiddenState({ body: 'Beleidigung', hiddenAt: new Date() })).toBe('evidence');
	});
});

describe('canHideIn', () => {
	test('participant care hides while reviewing a chat between participants', () => {
		expect(canHideIn({ side: 'REVIEW', kind: 'DIRECT' })).toBe(true);
		expect(canHideIn({ side: 'REVIEW', kind: 'DELEGATION' })).toBe(true);
	});

	test('nobody hides in a team chat, and no party hides at all', () => {
		expect(canHideIn({ side: 'REVIEW', kind: 'TEAM' })).toBe(false);
		expect(canHideIn({ side: 'TEAM', kind: 'TEAM' })).toBe(false);
		expect(canHideIn({ side: 'PARTICIPANT', kind: 'DIRECT' })).toBe(false);
	});
});
