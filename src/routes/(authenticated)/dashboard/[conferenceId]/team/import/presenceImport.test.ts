import { describe, expect, test } from 'vitest';
import {
	parsePresenceExport,
	representationLabel,
	scoreDelegates,
	scoreNsas
} from './presenceImport';
import {
	CHASE_PRESENCE_SCHEMA_URL,
	type ChasePresenceParticipant
} from '#lib/schemata/chasePresence.js';

const event = (present: boolean, i: number) => ({
	id: `e${i}`,
	committeeId: 'c1',
	present,
	type: present ? 'NSA_SCAN' : 'AUTO_SWITCH',
	timestamp: new Date(2026, 9, 1, 9 + i).toISOString()
});

const participant = (
	kind: ChasePresenceParticipant['kind'],
	email: string,
	presence: boolean[]
): ChasePresenceParticipant => ({
	email,
	kind,
	committeeId: kind === 'DELEGATE' ? 'c1' : null,
	representation: null,
	events: presence.map(event)
});

describe('parsePresenceExport', () => {
	test('reads an export', () => {
		const text = JSON.stringify({
			$schema: CHASE_PRESENCE_SCHEMA_URL,
			exportedAt: '2026-10-01T18:00:00.000Z',
			conferenceId: 'conf',
			participants: [participant('NSA', 'a@example.org', [true])]
		});
		const parsed = parsePresenceExport(text);
		expect(parsed.ok && parsed.data.participants[0].email).toBe('a@example.org');
	});

	test('refuses the old committee member export and anything that is not JSON', () => {
		const old = JSON.stringify([{ id: 'x', committeeId: 'c1', presenceChangedTimestamps: [] }]);
		expect(parsePresenceExport(old).ok).toBe(false);
		expect(parsePresenceExport('not json').ok).toBe(false);
	});
});

describe('scoreDelegates', () => {
	test('scores the share of present records and leaves out delegates without any', () => {
		const scored = scoreDelegates(
			[
				participant('DELEGATE', 'often@example.org', [true, true, true, false]),
				participant('DELEGATE', 'rarely@example.org', [true, false, false, false, false]),
				participant('DELEGATE', 'never-called@example.org', []),
				participant('NSA', 'nsa@example.org', [true])
			],
			50
		);
		expect(scored.map((d) => [d.email, d.attendancePercentage, d.attended])).toEqual([
			['often@example.org', 75, true],
			['rarely@example.org', 20, false]
		]);
	});
});

describe('scoreNsas', () => {
	test('counts check-ins only, so check-outs neither help nor hurt', () => {
		const scored = scoreNsas(
			[
				participant('NSA', 'stays@example.org', [true, true, true]),
				participant('NSA', 'wanders@example.org', [true, false, true, false]),
				participant('DELEGATE', 'delegate@example.org', [true, true, true])
			],
			3
		);
		expect(scored.map((n) => [n.email, n.checkIns, n.attended])).toEqual([
			['stays@example.org', 3, true],
			['wanders@example.org', 2, false]
		]);
	});

	test('marks an NSA who was never scanned in as absent instead of skipping them', () => {
		expect(scoreNsas([participant('NSA', 'unseen@example.org', [])], 1)).toEqual([
			{ email: 'unseen@example.org', representation: null, checkIns: 0, attended: false }
		]);
	});
});

describe('representationLabel', () => {
	const representation = { id: 'r1', type: 'DELEGATION' as const };
	test('prefers the nation code, then the name', () => {
		expect(representationLabel({ ...representation, alpha3Code: 'DEU', name: 'Germany' })).toBe(
			'DEU'
		);
		expect(representationLabel({ ...representation, name: 'Amnesty' })).toBe('Amnesty');
	});
	test('shows N/A without either', () => {
		expect(representationLabel(null)).toBe('N/A');
		expect(representationLabel(representation)).toBe('N/A');
	});
});
