import { describe, expect, test } from 'vitest';
import { collectConfigChanges, formatValue, groupConfigChanges } from './changePreview';

type ConferenceState = 'PRE' | 'PARTICIPANT_REGISTRATION' | 'PREPARATION' | 'ACTIVE' | 'POST';

const saved: {
	title: string;
	location: string;
	state: ConferenceState;
	unlockPayments: boolean;
	feeAmount: number;
	startConference: Date;
} = {
	title: 'MUN-SH 2026',
	location: 'Kiel',
	state: 'PRE',
	unlockPayments: false,
	feeAmount: 75,
	startConference: new Date('2026-03-12T09:00:00Z')
};

function collect(
	current: Partial<typeof saved> & Record<string, unknown>,
	tainted: Record<string, unknown> | undefined,
	existingFiles: Record<string, boolean> = {}
) {
	return collectConfigChanges({
		saved,
		current,
		tainted,
		existingFiles
	});
}

describe('collectConfigChanges', () => {
	test('returns nothing when the form was never touched', () => {
		expect(collect({ ...saved, title: 'Changed' }, undefined)).toEqual([]);
	});

	test('only reports fields that superforms marked as tainted', () => {
		const changes = collect(
			{ ...saved, title: 'MUN-SH 2027', location: 'Lübeck' },
			{ title: true }
		);
		expect(changes.map((c) => c.key)).toEqual(['title']);
		expect(changes[0].before).toBe('MUN-SH 2026');
		expect(changes[0].after).toBe('MUN-SH 2027');
		expect(changes[0].group).toBe('general');
	});

	test('skips a tainted field whose value did not actually change', () => {
		expect(collect({ ...saved }, { title: true })).toEqual([]);
	});

	test('skips a tainted date that was reverted to its original instant', () => {
		// Superforms compares with === , so an equal-but-distinct Date stays tainted.
		const changes = collect(
			{ ...saved, startConference: new Date('2026-03-12T09:00:00Z') },
			{ startConference: true }
		);
		expect(changes).toEqual([]);
	});

	test('ignores tainted entries that superforms reset to undefined', () => {
		expect(collect({ ...saved, title: 'MUN-SH 2027' }, { title: undefined })).toEqual([]);
	});

	test('renders a date-only field from its UTC calendar date, without a time', () => {
		// Date-only fields are stored as UTC midnight; reading them in the browser
		// timezone would move them to the previous day west of UTC.
		const changes = collectConfigChanges({
			saved: { startConference: new Date('2026-03-12T00:00:00.000Z') },
			current: { startConference: new Date('2026-03-19T00:00:00.000Z') },
			tainted: { startConference: true },
			existingFiles: {}
		});
		expect(changes).toHaveLength(1);
		expect(changes[0].before).toContain('12');
		expect(changes[0].after).toContain('19');
		expect(changes[0].before).not.toMatch(/\d{2}:\d{2}/);
	});

	test('renders a datetime field with its wall clock time', () => {
		const changes = collectConfigChanges({
			saved: { startAssignment: new Date('2026-03-12T09:00:00.000Z') },
			current: { startAssignment: new Date('2026-03-12T11:30:00.000Z') },
			tainted: { startAssignment: true },
			existingFiles: {}
		});
		expect(changes).toHaveLength(1);
		expect(changes[0].after).toMatch(/\d{1,2}:\d{2}/);
	});

	test('formats booleans as on/off and marks feature toggles as high impact', () => {
		const changes = collect({ ...saved, unlockPayments: true }, { unlockPayments: true });
		expect(changes).toHaveLength(1);
		expect(changes[0].highImpact).toBe(true);
		expect(changes[0].note).toBeTruthy();
		expect(changes[0].before).not.toBe(changes[0].after);
	});

	test('resolves the conference state to its human readable label', () => {
		const changes = collect({ ...saved, state: 'ACTIVE' }, { state: true });
		expect(changes).toHaveLength(1);
		expect(changes[0].highImpact).toBe(true);
		expect(changes[0].before).not.toBe('PRE');
		expect(changes[0].after).not.toBe('ACTIVE');
	});

	test('marks banking data as high impact', () => {
		const changes = collect({ ...saved, feeAmount: 85 }, { feeAmount: true });
		expect(changes[0].group).toBe('payments');
		expect(changes[0].highImpact).toBe(true);
	});

	test('treats an empty file input as no upload', () => {
		const changes = collect(
			{ ...saved, certificateBasePDF: new File([], '') },
			{ certificateBasePDF: true }
		);
		expect(changes).toEqual([]);
	});

	test('reports a picked file as a change and names the existing document', () => {
		const file = new File(['x'.repeat(2048)], 'certificate.pdf');
		const changes = collect(
			{ ...saved, certificateBasePDF: file },
			{ certificateBasePDF: true },
			{
				certificateBasePDF: true
			}
		);
		expect(changes).toHaveLength(1);
		expect(changes[0].isFile).toBe(true);
		expect(changes[0].after).toContain('certificate.pdf');
		expect(changes[0].after).toContain('2.0 KB');
		expect(changes[0].group).toBe('documents');
	});

	test('treats null, undefined and empty string as the same empty value', () => {
		const changes = collectConfigChanges({
			saved: { linkToTeamWiki: undefined },
			current: { linkToTeamWiki: '' },
			tainted: { linkToTeamWiki: true },
			existingFiles: {}
		});
		expect(changes).toEqual([]);
	});
});

describe('groupConfigChanges', () => {
	test('groups changes by tab and drops empty groups', () => {
		const changes = collect(
			{ ...saved, title: 'MUN-SH 2027', unlockPayments: true, feeAmount: 85 },
			{ title: true, unlockPayments: true, feeAmount: true }
		);
		const groups = groupConfigChanges(changes);
		expect(groups.map((g) => g.key)).toEqual(['general', 'status', 'payments']);
		expect(groups.every((g) => g.changes.length > 0)).toBe(true);
	});
});

describe('collectConfigChanges for files', () => {
	test('labels an upload without a stored document as not set before', () => {
		const changes = collect(
			{ ...saved, certificateBasePDF: new File(['x'], 'tiny.pdf') },
			{ certificateBasePDF: true }
		);
		expect(changes).toHaveLength(1);
		expect(changes[0].before).toBe(formatValue(undefined));
		expect(changes[0].after).toBe('tiny.pdf (1 B)');
		expect(changes[0].highImpact).toBe(false);
		expect(changes[0].note).toBeUndefined();
	});

	test('reports clearing a text field as a change to not set', () => {
		const changes = collect({ ...saved, location: '' }, { location: true });
		expect(changes).toHaveLength(1);
		expect(changes[0].before).toBe('Kiel');
		expect(changes[0].after).toBe(formatValue(null));
	});
});

describe('formatValue', () => {
	test('shows every empty value, including an empty file input, the same way', () => {
		const notSet = formatValue(undefined);
		expect(notSet).not.toBe('');
		expect(formatValue(null)).toBe(notSet);
		expect(formatValue('')).toBe(notSet);
		expect(formatValue(new File([], ''))).toBe(notSet);
	});

	test('shows booleans as distinct on and off labels', () => {
		expect(formatValue(true)).not.toBe(formatValue(false));
	});

	test('formats dates, numbers and strings', () => {
		const date = new Date('2026-03-12T09:00:00Z');
		expect(formatValue(date)).toBe(date.toLocaleString());
		expect(formatValue(1234.5)).toBe((1234.5).toLocaleString());
		expect(formatValue('Kiel')).toBe('Kiel');
	});

	test('names a file with its size in B, KB or MB', () => {
		expect(formatValue(new File(['abc'], 'a.pdf'))).toBe('a.pdf (3 B)');
		expect(formatValue(new File(['x'.repeat(1536)], 'b.pdf'))).toBe('b.pdf (1.5 KB)');
		expect(formatValue(new File(['x'.repeat(2 * 1024 * 1024)], 'c.pdf'))).toBe('c.pdf (2.0 MB)');
	});

	test('falls back to JSON for anything else', () => {
		expect(formatValue({ a: 1 })).toBe('{"a":1}');
		expect(formatValue(Symbol('s'))).toBe('');
	});
});
