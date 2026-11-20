// @vitest-environment node
import { describe, expect, test } from 'vitest';
import { currentTerms } from './terms';
import { documentHash } from './messagingTermsDocument';
import { termsOnDisk } from './termsOnDisk';

describe('termsOnDisk', () => {
	test('reads the same terms the app answers with', () => {
		const read = termsOnDisk();
		expect(read.version).toBe(currentTerms.version);
		expect(documentHash(read)).toBe(documentHash(currentTerms));
	});
});
