import { describe, expect, it } from 'vitest';
import {
	emptyRequestForm,
	fromSeedJsonText,
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

	it('rejects documents that are not JSON objects', () => {
		expect(fromSeedJsonText('not json')).toBeNull();
		expect(fromSeedJsonText('[]')).toBeNull();
	});
});
