import { describe, expect, test } from 'vitest';
import { conferenceStatusBlocks, formatHistoricComparison } from './conferenceStatusMessage';

type Stats = Parameters<typeof conferenceStatusBlocks>[2];

function stats(scale: number, roles: { role: string; total: number }[]): Stats {
	return {
		total: 10 * scale,
		notApplied: 4 * scale,
		applied: 6 * scale,
		delegations: { total: 3 * scale, notApplied: scale, applied: 2 * scale },
		delegationMembers: { total: 8 * scale, notApplied: 3 * scale, applied: 5 * scale },
		singleParticipants: {
			total: 2 * scale,
			notApplied: scale,
			applied: scale,
			byRole: roles.map(({ role, total }) => ({
				role,
				fontAwesomeIcon: undefined,
				total,
				applied: total - 1,
				notApplied: 1
			}))
		},
		supervisors: 2 * scale
	};
}

/** Every text in the blocks, in order, so assertions do not depend on Slack's nesting. */
function texts(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(texts);
	if (typeof value !== 'object' || value === null) return [];
	const own = 'text' in value && typeof value.text === 'string' ? [value.text] : [];
	return [...own, ...Object.values(value).flatMap(texts)];
}

describe('formatHistoricComparison', () => {
	test('shows the current number alone without a previous one', () => {
		expect(formatHistoricComparison(undefined, 5)).toBe('5');
		expect(formatHistoricComparison(0, 5)).toBe('5');
	});

	test('shows the change since the previous report', () => {
		expect(formatHistoricComparison(3, 5)).toBe('5 (+2)');
		expect(formatHistoricComparison(7, 5)).toBe('5 (-2)');
	});

	test('shows no change as the number alone', () => {
		expect(formatHistoricComparison(5, 5)).toBe('5');
	});
});

describe('conferenceStatusBlocks', () => {
	const conference = {
		title: 'MUN-SH 2026',
		startConference: new Date(2026, 2, 5),
		startAssignment: new Date(2026, 0, 31)
	};
	const countdowns = { daysUntilConference: 40, daysUntilEndRegistration: 7 };

	test('reports the countdowns and every count of a first report', () => {
		const result = texts(
			conferenceStatusBlocks(
				conference,
				countdowns,
				stats(1, [{ role: 'Presse', total: 4 }]),
				undefined
			)
		);
		expect(result[0]).toBe('Konferenz-Update: MUN-SH 2026');
		expect(result[1]).toMatch(/^Noch 40 Tage bis zur Konferenz \(Start am .*2026\)$/);
		expect(result[2]).toMatch(/^Anmeldung noch 7 Tage offen \(bis .*2026\)$/);
		expect(result).toContain('Anmeldungen Gesamt: ');
		expect(result).toContain('Presse: ');
		expect(result.slice(result.indexOf('Presse: '), result.indexOf('Presse: ') + 6)).toEqual([
			'Presse: ',
			'4',
			'   |   ',
			'1',
			' offen   |   ',
			'3'
		]);
	});

	test('compares every count with the previous report', () => {
		const result = texts(
			conferenceStatusBlocks(
				conference,
				countdowns,
				stats(2, [
					{ role: 'Presse', total: 4 },
					{ role: 'Richter', total: 2 }
				]),
				stats(1, [{ role: 'Presse', total: 3 }])
			)
		);
		expect(result[result.indexOf('Anmeldungen Gesamt: ') + 1]).toBe('20 (+10)');
		expect(result[result.indexOf('Angemeldete Betreuer*innen: ') + 1]).toBe('4 (+2)');
		expect(result[result.indexOf('Presse: ') + 1]).toBe('4 (+1)');
		// A role the previous report did not have yet has nothing to compare with.
		expect(result[result.indexOf('Richter: ') + 1]).toBe('2');
	});

	test('says when the conference has no dates yet', () => {
		const result = texts(
			conferenceStatusBlocks(
				{ title: 'Ohne Datum', startConference: null, startAssignment: null },
				countdowns,
				stats(1, []),
				undefined
			)
		);
		expect(result).toContain('Kein Konferenzdatum festgelegt');
		expect(result).toContain('Kein Anmeldeschluss festgelegt');
	});
});
