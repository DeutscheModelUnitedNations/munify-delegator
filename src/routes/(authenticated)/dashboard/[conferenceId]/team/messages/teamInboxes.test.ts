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

	test('a trusted person answers the shared inbox and their own', () => {
		const inboxes = inboxesOf({
			cares: true,
			functions: [fn('CHAIR', 'ga', 'GV'), { kind: 'TRUSTED_PERSON', committeeId: null }]
		});
		expect(inboxes.map((inbox) => [inbox.key, inbox.own])).toEqual([
			['PARTICIPANT_CARE', false],
			['TRUSTED_PERSON', false],
			['TRUSTED_PERSON:own', true],
			['CHAIR:ga', false]
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

	test('keeps a chat written to one trusted person apart from the shared inbox', () => {
		expect(inboxKey({ inbox: 'TRUSTED_PERSON' })).toBe('TRUSTED_PERSON');
		expect(inboxKey({ inbox: 'TRUSTED_PERSON', trustedPersonName: 'Anna Meier' })).toBe(
			'TRUSTED_PERSON:own'
		);
	});
});
