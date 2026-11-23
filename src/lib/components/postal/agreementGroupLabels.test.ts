import { describe, expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { inDocumentOrder, pageLabel } from './agreementGroupLabels';

describe('pageLabel', () => {
	test('names a page by the fields on it', () => {
		expect(pageLabel(['termsAccepted', 'termsSignature'])).toBe(m.agreementGroupContract());
		expect(pageLabel(['mediaPhoto', 'mediaInternal'])).toBe(
			`${m.agreementGroupMediaForms()}, ${m.agreementGroupMediaPurposes()}`
		);
		expect(pageLabel([])).toBeUndefined();
		expect(pageLabel(['somethingNew'])).toBeUndefined();
	});
});

describe('inDocumentOrder', () => {
	test('puts the contract first and unknown pages last, else as they were', () => {
		const scans = [
			{ id: 1, fields: [] },
			{ id: 2, fields: ['mediaSignature'] },
			{ id: 3, fields: ['termsSignature'] },
			{ id: 4, fields: ['mediaPlaceDate'] }
		];
		expect(inDocumentOrder(scans).map(({ id }) => id)).toEqual([3, 2, 4, 1]);
	});
});
