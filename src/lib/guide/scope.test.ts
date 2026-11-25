import { describe, expect, test } from 'vitest';
import {
	EVERYWHERE,
	conferenceYear,
	sameScope,
	scopeFor,
	scopeKindOf,
	scopeContextOf,
	scopeReaches,
	type ScopeTarget
} from './scope';

const munsh2027: ScopeTarget = { id: 'sh27', seriesId: 'sh', year: 2027 };
const munbw2026: ScopeTarget = { id: 'bw26', seriesId: 'bw', year: 2026 };
const foreign: ScopeTarget = { id: 'other', seriesId: null, year: 2027 };

describe('scopeReaches', () => {
	test('everywhere reaches every conference of a series, never one without', () => {
		expect(scopeReaches({ scope: EVERYWHERE, conference: munsh2027 })).toBe(true);
		expect(scopeReaches({ scope: EVERYWHERE, conference: munbw2026 })).toBe(true);
		expect(scopeReaches({ scope: EVERYWHERE, conference: foreign })).toBe(false);
	});

	test('a year reaches the conferences starting in it', () => {
		const scope = scopeFor({ kind: 'YEAR', conference: munsh2027 });
		expect(scopeReaches({ scope, conference: munsh2027 })).toBe(true);
		expect(scopeReaches({ scope, conference: munbw2026 })).toBe(false);
		expect(scopeReaches({ scope, conference: foreign })).toBe(false);
	});

	test('a series reaches its conferences of every year', () => {
		const scope = scopeFor({ kind: 'SERIES', conference: munbw2026 });
		expect(scopeReaches({ scope, conference: munbw2026 })).toBe(true);
		expect(scopeReaches({ scope, conference: { ...munbw2026, id: 'bw27', year: 2027 } })).toBe(
			true
		);
		expect(scopeReaches({ scope, conference: munsh2027 })).toBe(false);
	});

	test('a conference scope reaches that conference only, series or not', () => {
		expect(
			scopeReaches({
				scope: scopeFor({ kind: 'CONFERENCE', conference: foreign }),
				conference: foreign
			})
		).toBe(true);
		expect(
			scopeReaches({
				scope: scopeFor({ kind: 'CONFERENCE', conference: munsh2027 }),
				conference: munbw2026
			})
		).toBe(false);
	});
});

test('scopeKindOf names the four modes', () => {
	expect(scopeKindOf(EVERYWHERE)).toBe('EVERYWHERE');
	expect(scopeKindOf({ ...EVERYWHERE, year: 2026 })).toBe('YEAR');
	expect(scopeKindOf({ ...EVERYWHERE, seriesId: 'sh' })).toBe('SERIES');
	expect(scopeKindOf({ ...EVERYWHERE, conferenceId: 'c' })).toBe('CONFERENCE');
});

test('sameScope compares all three columns', () => {
	expect(sameScope(EVERYWHERE, { ...EVERYWHERE })).toBe(true);
	expect(sameScope(EVERYWHERE, { ...EVERYWHERE, year: 2026 })).toBe(false);
});

test('conferenceYear goes by the conference time zone', () => {
	const newYearsEveUtc = new Date('2026-12-31T23:30:00Z');
	expect(conferenceYear({ start: newYearsEveUtc, timezone: 'Europe/Berlin' })).toBe(2027);
	expect(conferenceYear({ start: newYearsEveUtc, timezone: 'UTC' })).toBe(2026);
});

test('scopeContextOf names the series and the year', () => {
	expect(
		scopeContextOf({
			startConference: '2027-03-01T08:00:00Z',
			timezone: 'Europe/Berlin',
			series: { name: 'MUN-SH' }
		})
	).toEqual({ year: 2027, seriesName: 'MUN-SH' });
	expect(
		scopeContextOf({ startConference: new Date('2026-05-01'), timezone: 'UTC', series: null })
	).toEqual({ year: 2026, seriesName: null });
});
