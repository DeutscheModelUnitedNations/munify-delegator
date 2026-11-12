import { describe, expect, test } from 'vitest';
import { inboxKey, inboxesOf } from './teamInboxes';

const fn = (kind: 'CHAIR' | 'CONSULTANT', committeeId: string, abbreviation: string) => ({
	kind,
	committeeId,
	committee: { abbreviation }
});

describe('inboxesOf', () => {
	test('lists participant care first, then the functions by committee', () => {
		const inboxes = inboxesOf({
			cares: true,
			functions: [
				fn('CONSULTANT', 'sc', 'SR'),
				fn('CONSULTANT', 'ga', 'GV'),
				fn('CHAIR', 'ga', 'GV')
			]
		});
		expect(inboxes.map((inbox) => inbox.key)).toEqual([
			'PARTICIPANT_CARE',
			'CHAIR:ga',
			'CONSULTANT:ga',
			'CONSULTANT:sc'
		]);
	});

	test('somebody without care role or function answers nothing', () => {
		expect(inboxesOf({ cares: false, functions: [] })).toEqual([]);
	});
});

describe('inboxKey', () => {
	test('matches a chat to the inbox it belongs to', () => {
		expect(inboxKey({ inbox: 'CHAIR', committeeId: 'ga' })).toBe('CHAIR:ga');
		expect(inboxKey({ inbox: 'PARTICIPANT_CARE', committeeId: null })).toBe('PARTICIPANT_CARE');
	});
});
