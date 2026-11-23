import { describe, expect, test } from 'vitest';
import { judgeRescan, type StoredReadings } from './rescan';

const page = (accepted: 'yes' | 'no' | 'unclear', signed: 'yes' | 'no' | 'unclear') => [
	{ field: 'termsAccepted', state: accepted },
	{ field: 'termsSignature', state: signed }
];
const judge = (before: StoredReadings, readings: StoredReadings) =>
	judgeRescan({ known: { readings: before }, readings });

describe('judgeRescan', () => {
	test('keeps a page not kept yet, readable or not', () => {
		expect(judgeRescan({ known: undefined, readings: page('yes', 'yes') })).toBe('stored');
		expect(judgeRescan({ known: undefined, readings: null })).toBe('stored');
	});

	test('leaves a page that says nothing new', () => {
		expect(judge(page('yes', 'no'), page('yes', 'no'))).toBe('known');
		// a poorer scan of it
		expect(judge(page('yes', 'yes'), page('unclear', 'yes'))).toBe('known');
		expect(judge(page('yes', 'yes'), null)).toBe('known');
		expect(judge(null, null)).toBe('known');
	});

	test('takes a page signed since, or read better, in place of the earlier scan', () => {
		expect(judge(page('yes', 'no'), page('yes', 'yes'))).toBe('replaced');
		expect(judge(page('yes', 'unclear'), page('yes', 'no'))).toBe('replaced');
		expect(judge(null, page('no', 'no'))).toBe('replaced');
	});

	test('never loses what was there before, and tells', () => {
		expect(judge(page('yes', 'yes'), page('yes', 'no'))).toBe('differs');
		expect(judge(page('yes', 'no'), page('no', 'yes'))).toBe('differs');
	});
});
