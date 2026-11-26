import { describe, expect, it } from 'vitest';
import { formatPaymentReference, paymentReferenceCandidates } from './paymentReference';

const REFERENCE = 'ACDE-FHJK-MNPR-TUVW';

describe('formatPaymentReference', () => {
	it('puts a dash after every four characters', () => {
		expect(formatPaymentReference('ACDEFHJKMNPRTUVW')).toBe(REFERENCE);
	});
});

describe('paymentReferenceCandidates', () => {
	it('finds a reference as printed', () => {
		expect(paymentReferenceCandidates(REFERENCE)).toEqual([REFERENCE]);
	});

	it('finds it anywhere in the purpose, around other text', () => {
		expect(paymentReferenceCandidates(`Teilnahmebeitrag ${REFERENCE} MUN-SH 2027`)).toContain(
			REFERENCE
		);
	});

	it('finds it lower-cased, without dashes, re-spaced or broken over lines', () => {
		for (const purpose of [
			'acde-fhjk-mnpr-tuvw',
			'ACDEFHJKMNPRTUVW',
			'ACDE FHJK MNPR TUVW',
			'ACDE-FHJK-\nMNPR-TUVW',
			'SVWZ+ACDE-FH JK-MNPR-TUVW'
		]) {
			expect(paymentReferenceCandidates(purpose)).toContain(REFERENCE);
		}
	});

	it('finds every reference of a transfer paying several', () => {
		const other = 'XY34-79AC-DEFH-JKMN';
		const candidates = paymentReferenceCandidates(`${REFERENCE}, ${other}`);
		expect(candidates).toContain(REFERENCE);
		expect(candidates).toContain(other);
	});

	it('finds nothing in text without 16 characters of the alphabet in a row', () => {
		expect(paymentReferenceCandidates('Rechnung 2027-0042 Max Mustermann')).toEqual([]);
		expect(paymentReferenceCandidates('')).toEqual([]);
		// 15 characters only
		expect(paymentReferenceCandidates('ACDE-FHJK-MNPR-TUV')).toEqual([]);
	});

	it('is not fooled by characters outside the alphabet in between', () => {
		// an O breaks the run: no 16 allowed characters in a row
		expect(paymentReferenceCandidates('ACDE-FHJK-OMNPR-TUVW')).toEqual([]);
	});
});
