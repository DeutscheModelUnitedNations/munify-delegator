import { describe, expect, test } from 'vitest';
import {
	allPages,
	SESSION_EXPORT_PAGE,
	sessionPeopleCsvHeader,
	sessionPeopleCsvRow,
	sessionPeopleWhere,
	type ExportedScan
} from './sessionPeople';

describe('sessionPeopleWhere', () => {
	test('without a search, lists the whole session', () => {
		expect(sessionPeopleWhere({ sessionId: 's', search: '  ' })).toEqual({
			sessionId: { eq: 's' }
		});
	});

	test('every word has to match the name, email or access card', () => {
		const where = sessionPeopleWhere({ sessionId: 's', search: ' Ada  Lovelace ' });
		expect(where.sessionId).toEqual({ eq: 's' });
		expect(where.AND).toHaveLength(2);
		expect(where.AND?.[1]).toEqual({
			conferenceParticipant: {
				OR: [
					{
						user: {
							OR: [
								{ givenName: { ilike: '%Lovelace%' } },
								{ familyName: { ilike: '%Lovelace%' } },
								{ email: { ilike: '%Lovelace%' } }
							]
						}
					},
					{ accessCardId: { ilike: '%Lovelace%' } }
				]
			}
		});
	});

	test('matches like wildcards literally', () => {
		const where = sessionPeopleWhere({ sessionId: 's', search: '100%' });
		expect(JSON.stringify(where)).toContain('%100\\\\%%');
	});
});

describe('sessionPeopleCsvRow', () => {
	const scan = (checkPassed: boolean | null): ExportedScan => ({
		timestamp: new Date('2026-05-21T07:16:00Z'),
		checkPassed,
		conferenceParticipant: {
			accessCardId: null,
			user: { id: 'u1', givenName: 'Ada', familyName: 'Lovelace', email: 'ada@example.org' }
		},
		recordedBy: { givenName: 'Grace', familyName: 'Hopper' }
	});
	const formatTime = (date: Date) => date.toISOString();

	test('has a value for every column', () => {
		const row = sessionPeopleCsvRow({ scan: scan(true), formatTime });
		expect(row).toHaveLength(sessionPeopleCsvHeader().length);
		expect(row).toEqual([
			'2026-05-21T07:16:00.000Z',
			'Ada',
			'Lovelace',
			'ada@example.org',
			'',
			'Ja',
			'Grace Hopper',
			'u1'
		]);
	});

	test('a failed check reads no, a session that only records leaves it empty', () => {
		expect(sessionPeopleCsvRow({ scan: scan(false), formatTime })[5]).toBe('Nein');
		expect(sessionPeopleCsvRow({ scan: scan(null), formatTime })[5]).toBe('');
	});
});

describe('allPages', () => {
	test('asks for pages until one comes back short', async () => {
		const full = Array.from({ length: SESSION_EXPORT_PAGE }, (_, index) => index);
		const offsets: number[] = [];
		const rows = await allPages(async (offset) => {
			offsets.push(offset);
			return offset === 0 ? full : [SESSION_EXPORT_PAGE];
		});

		expect(offsets).toEqual([0, SESSION_EXPORT_PAGE]);
		expect(rows).toHaveLength(SESSION_EXPORT_PAGE + 1);
	});

	test('a first page that is short is the only one asked for', async () => {
		const offsets: number[] = [];
		const rows = await allPages(async (offset) => {
			offsets.push(offset);
			return ['a', 'b'];
		});

		expect(offsets).toEqual([0]);
		expect(rows).toEqual(['a', 'b']);
	});
});
