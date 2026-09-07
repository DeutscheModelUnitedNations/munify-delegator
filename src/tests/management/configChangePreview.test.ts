import { describe, expect, test } from 'vitest';
import {
	collectConfigChanges,
	groupConfigChanges
} from '../../routes/(authenticated)/management/[conferenceId]/configuration/changePreview';

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
