import { describe, expect, test } from 'vitest';
import { delegationColumnChanges } from './delegationColumnChanges';

const code = () => 'NEWCODE';

describe('delegationColumnChanges', () => {
	test('writes nothing for an update that changes no column of the row', () => {
		expect(
			delegationColumnChanges({ args: { experience: undefined }, newEntryCode: code })
		).toEqual({});
		expect(
			delegationColumnChanges({ args: { resetEntryCode: false }, newEntryCode: code })
		).toEqual({});
	});

	test('writes only the texts that are given, so a concurrent edit of the other one survives', () => {
		expect(
			delegationColumnChanges({ args: { experience: 'MUN 2024' }, newEntryCode: code })
		).toEqual({ experience: 'MUN 2024' });
		expect(
			delegationColumnChanges({
				args: { experience: null, motivation: 'Why we go' },
				newEntryCode: code
			})
		).toEqual({ experience: null, motivation: 'Why we go' });
	});

	test('clears a text given as null', () => {
		expect(delegationColumnChanges({ args: { motivation: null }, newEntryCode: code })).toEqual({
			motivation: null
		});
	});

	test('hands out a fresh entry code only when asked to', () => {
		expect(delegationColumnChanges({ args: { resetEntryCode: true }, newEntryCode: code })).toEqual(
			{ entryCode: 'NEWCODE' }
		);
	});
});
