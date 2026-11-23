import { describe, expect, test } from 'vitest';
import { agreementField, agreementState } from '#api/db/schema/index';
import { AGREEMENT_FIELDS, planDetails, type StoredDetail } from './agreementDetails';
import { PAPER_FIELDS } from './fields';
import type { FieldReading } from './readPaper';

describe('the details', () => {
	test("are every field of the documents but the child's name, which the form prints", () => {
		const fields = Object.keys(PAPER_FIELDS).filter((field) => field !== 'guardianChildName');
		expect([...AGREEMENT_FIELDS].sort()).toEqual(fields.sort());
		expect([...agreementField.enumValues].sort()).toEqual(fields.sort());
	});

	test('are stored in the states they are read in', () => {
		const states: readonly FieldReading['state'][] = agreementState.enumValues;
		expect(states).toEqual(['yes', 'no', 'unclear']);
	});
});

describe('planDetails', () => {
	const scanned = (field: StoredDetail['field'], state: StoredDetail['state']): StoredDetail => ({
		field,
		state,
		source: 'SCAN'
	});
	const plan = ({
		readings,
		stored = [],
		confirm = false
	}: {
		readings: FieldReading[];
		stored?: StoredDetail[];
		confirm?: boolean;
	}) => planDetails({ readings, stored, confirm });

	test('writes what nothing is known of, unclear too, and leaves what the form prints', () => {
		expect(
			plan({
				readings: [
					{ field: 'mediaPhoto', state: 'yes' },
					{ field: 'termsSignature', state: 'unclear' },
					{ field: 'guardianChildName', state: 'yes' }
				]
			})
		).toEqual({
			write: [
				{ field: 'termsSignature', state: 'unclear' },
				{ field: 'mediaPhoto', state: 'yes' }
			],
			differing: []
		});
	});

	test('takes a clear reading over an unclear one, and never the other way', () => {
		expect(
			plan({
				readings: [
					{ field: 'mediaPhoto', state: 'no' },
					{ field: 'mediaVideo', state: 'unclear' }
				],
				stored: [scanned('mediaPhoto', 'unclear'), scanned('mediaVideo', 'yes')]
			})
		).toEqual({ write: [{ field: 'mediaPhoto', state: 'no' }], differing: [] });
	});

	test('takes a signature made up for, but no choice changed, nor anything taken back', () => {
		expect(
			plan({
				readings: [
					{ field: 'termsSignature', state: 'yes' },
					{ field: 'termsAccepted', state: 'no' },
					{ field: 'mediaPhoto', state: 'yes' },
					{ field: 'mediaVideo', state: 'no' }
				],
				stored: [
					scanned('termsSignature', 'no'),
					scanned('termsAccepted', 'yes'),
					scanned('mediaPhoto', 'no'),
					scanned('mediaVideo', 'yes')
				]
			})
		).toEqual({
			write: [{ field: 'termsSignature', state: 'yes' }],
			differing: ['termsAccepted', 'mediaPhoto', 'mediaVideo']
		});
	});

	test('takes a changed choice a person looked at, but never over what a person set', () => {
		expect(
			plan({
				confirm: true,
				readings: [
					{ field: 'mediaPhoto', state: 'yes' },
					{ field: 'mediaVideo', state: 'no' }
				],
				stored: [
					scanned('mediaPhoto', 'no'),
					{ field: 'mediaVideo', state: 'yes', source: 'MANUAL' }
				]
			})
		).toEqual({ write: [{ field: 'mediaPhoto', state: 'yes' }], differing: ['mediaVideo'] });
	});
});
