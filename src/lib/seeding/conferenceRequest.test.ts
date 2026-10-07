import { describe, expect, it } from 'vitest';
import {
	emptyRequestForm,
	fromSeedJsonText,
	isNonexistentLocalTime,
	isoToLocal,
	localToIso,
	newCommittee,
	toSeedJson
} from '$lib/seeding/conferenceRequest';
import { ConferenceSeedingSchema } from '$lib/seeding/seedSchema';

describe('conferenceRequest', () => {
	describe('localToIso', () => {
		it('uses the winter offset outside daylight saving time', () => {
			expect(localToIso('2027-01-10T09:00')).toBe('2027-01-10T09:00:00+01:00');
		});

		it('uses the summer offset during daylight saving time', () => {
			expect(localToIso('2027-07-10T09:00')).toBe('2027-07-10T09:00:00+02:00');
		});

		it('returns an empty string for incomplete input', () => {
			expect(localToIso('')).toBe('');
			expect(localToIso('2027-07-10')).toBe('');
		});
	});

	it('round-trips dates between the input format and ISO', () => {
		expect(isoToLocal(localToIso('2027-03-10T09:00'))).toBe('2027-03-10T09:00');
		expect(isoToLocal('2027-03-10T08:00:00Z')).toBe('2027-03-10T09:00');
	});

	it('produces a document that passes the seeding schema and survives an import', () => {
		const form = {
			...emptyRequestForm(),
			title: 'MUN-Example 2027',
			longTitle: 'Model United Nations Example 2027',
			location: 'Kiel',
			website: 'https://example.org',
			language: 'Deutsch',
			startAssignment: '2026-12-01T00:00',
			startConference: '2027-03-10T09:00',
			endConference: '2027-03-13T17:00',
			committees: [
				{ ...newCommittee(), name: 'Sicherheitsrat', abbreviation: 'SR', nations: ['DE'] }
			]
		};

		const json = toSeedJson(form);
		expect(ConferenceSeedingSchema.safeParse(json).success).toBe(true);

		const imported = fromSeedJsonText(JSON.stringify(json));
		expect(imported).toMatchObject({
			title: form.title,
			startConference: form.startConference,
			committees: [{ name: 'Sicherheitsrat', abbreviation: 'SR', nations: ['DE'] }]
		});
	});

	describe('daylight saving time edge cases', () => {
		it('treats a time skipped by the spring clock change as nonexistent', () => {
			expect(localToIso('2027-03-28T02:30')).toBe('');
			expect(isNonexistentLocalTime('2027-03-28T02:30')).toBe(true);
			expect(isNonexistentLocalTime('2027-03-28T03:30')).toBe(false);
			expect(isNonexistentLocalTime('')).toBe(false);
		});

		it('keeps both occurrences of the repeated autumn hour apart across an import', () => {
			for (const iso of ['2027-10-31T02:30:00+02:00', '2027-10-31T02:30:00+01:00']) {
				const imported = fromSeedJsonText(JSON.stringify({ conference: { startConference: iso } }));
				expect(imported).not.toBeNull();
				if (!imported) return;
				expect(toSeedJson(imported).conference.startConference).toBe(iso);
			}
		});
	});

	it('rejects objects that are not seed documents', () => {
		expect(fromSeedJsonText('{"unrelated": true}')).toBeNull();
	});

	it('rejects a document with a malformed list entry instead of dropping the list', () => {
		expect(
			fromSeedJsonText(JSON.stringify({ conference: {}, committees: [{ name: 'GV' }, 'oops'] }))
		).toBeNull();
		expect(fromSeedJsonText(JSON.stringify({ conference: {}, nsa: 'not a list' }))).toBeNull();
	});

	it('accepts a document with only a conference', () => {
		expect(fromSeedJsonText('{"conference": {}}')).toMatchObject({ committees: [], nsa: [] });
	});

	it('rejects documents that are not JSON objects', () => {
		expect(fromSeedJsonText('not json')).toBeNull();
		expect(fromSeedJsonText('[]')).toBeNull();
	});
});
