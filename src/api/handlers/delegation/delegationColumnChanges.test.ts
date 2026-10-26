import { describe, expect, test } from 'vitest';
import { delegationColumnChanges } from './delegationColumnChanges';

const code = () => 'NEWCODE';

describe('delegationColumnChanges', () => {
	test('writes nothing for an update that changes no column of the row', () => {
		expect(delegationColumnChanges({ experience: undefined }, code)).toEqual({});
		expect(delegationColumnChanges({ resetEntryCode: false }, code)).toEqual({});
	});

	test('writes both texts once either is given, leaving an absent one alone', () => {
		expect(delegationColumnChanges({ experience: 'MUN 2024' }, code)).toEqual({
			experience: 'MUN 2024',
			motivation: undefined
		});
		expect(delegationColumnChanges({ experience: null, motivation: 'Why we go' }, code)).toEqual({
			experience: null,
			motivation: 'Why we go'
		});
	});

	test('does not write texts that are both empty', () => {
		expect(delegationColumnChanges({ experience: '', motivation: null }, code)).toEqual({});
	});

	test('hands out a fresh entry code only when asked to', () => {
		expect(delegationColumnChanges({ resetEntryCode: true }, code)).toEqual({
			entryCode: 'NEWCODE'
		});
	});
});
