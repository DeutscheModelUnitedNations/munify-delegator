import { describe, expect, test } from 'vitest';
import { describeChange, describeNote } from './paperText';

describe('describeChange', () => {
	test('names a line per signed document and the media choice', () => {
		expect(describeChange({})).toEqual([]);
		expect(
			describeChange({
				termsAndConditions: 'DONE',
				guardianConsent: 'DONE',
				mediaConsent: 'DONE',
				mediaConsentStatus: 'NOT_ALLOWED'
			})
		).toHaveLength(4);
	});
});

describe('describeNote', () => {
	test('words every kind of note', () => {
		const notes = [
			describeNote({ kind: 'unsigned', document: 'contract' }),
			describeNote({ kind: 'unclear', document: 'mediaConsent' }),
			describeNote({ kind: 'mediaChoiceUnclear' }),
			describeNote({ kind: 'mediaChoiceDiffers', read: 'NOT_ALLOWED', stored: 'ALLOWED_ALL' })
		];
		expect(new Set(notes).size).toBe(4);
		notes.forEach((note) => expect(note.length).toBeGreaterThan(5));
	});
});
