import { describe, expect, test } from 'vitest';
import type { PersonPages } from '#lib/paperScan/intake/people';
import { oncePerPerson, personReport, withResult, type PersonResult } from './paperBatch';

const result = (changes: Partial<PersonResult>): PersonResult => ({
	userId: 'ada',
	name: 'Ada',
	pages: 1,
	unreadable: 0,
	change: {},
	notes: [],
	missing: false,
	stored: 1,
	replaced: 0,
	known: 0,
	...changes
});

describe('withResult', () => {
	test('adds a line per person', () => {
		const people = withResult({ people: [result({})], result: result({ userId: 'bob' }) });
		expect(people.map(({ userId }) => userId)).toEqual(['ada', 'bob']);
	});

	test("adds up a person's files, with the notes of the last", () => {
		const first = result({
			pages: 2,
			unreadable: 1,
			change: { termsAndConditions: 'DONE' },
			notes: [{ kind: 'incomplete', document: 'mediaConsent' }],
			error: 'offline'
		});
		const second = result({ change: { mediaConsent: 'DONE' }, stored: 0, known: 1 });
		expect(withResult({ people: [first], result: second })).toEqual([
			result({
				pages: 3,
				unreadable: 1,
				stored: 1,
				known: 1,
				change: { termsAndConditions: 'DONE', mediaConsent: 'DONE' },
				notes: [],
				error: 'offline'
			})
		]);
	});
});

describe('personReport', () => {
	const person: PersonPages = {
		conferenceId: 'conf',
		userId: 'ada',
		pages: [
			{
				page: 1,
				code: 'A',
				fields: [],
				readings: [
					{ field: 'termsAccepted', state: 'yes' },
					{ field: 'termsSignature', state: 'yes' },
					{ field: 'mediaPhoto', state: 'no' }
				]
			},
			{ page: 2, code: 'B', fields: [], readings: null }
		]
	};
	const row = {
		termsAndConditions: 'PENDING',
		guardianConsent: 'PENDING',
		mediaConsent: 'PENDING',
		mediaConsentStatus: 'NOT_SET',
		agreementDetails: [
			{ field: 'termsPlaceDate', state: 'yes', source: 'SCAN' },
			{ field: 'mediaPhoto', state: 'yes', source: 'MANUAL' }
		],
		user: { givenName: 'Ada', familyName: 'Lovelace', birthday: new Date('1990-01-01') },
		conference: { startConference: new Date('2026-05-21') }
	} as const;

	test('tells what changes, knowing the details of earlier scans, and what was left', () => {
		const report = personReport({
			person,
			row,
			kept: [{ outcome: 'replaced' }, { outcome: 'known' }]
		});
		expect(report).toMatchObject({
			pages: 2,
			unreadable: 1,
			missing: false,
			stored: 0,
			replaced: 1,
			known: 1,
			change: { termsAndConditions: 'DONE' }
		});
		expect(report.name).toContain('Ada');
		expect(report.notes).toContainEqual({ kind: 'detailDiffers', field: 'mediaPhoto' });
	});

	test('claims no change where a page could not be saved', () => {
		const report = personReport({
			person,
			row,
			kept: [{ outcome: 'failed', error: 'offline' }, { outcome: 'stored' }]
		});
		expect(report).toMatchObject({ error: 'offline', change: {}, stored: 1 });
	});

	test('tells what was read of somebody not registered, by their id', () => {
		expect(personReport({ person, row: undefined, kept: [] })).toMatchObject({
			name: 'ada',
			missing: true
		});
	});
});

test('oncePerPerson asks for each person once', async () => {
	const asked: string[] = [];
	const ask = oncePerPerson(async ({ userId }) => {
		asked.push(userId);
		return `${userId}'s row`;
	});
	expect([await ask({ userId: 'ada' }), await ask({ userId: 'bob' })]).toEqual([
		"ada's row",
		"bob's row"
	]);
	expect(await ask({ userId: 'ada' })).toBe("ada's row");
	expect(asked).toEqual(['ada', 'bob']);
});
