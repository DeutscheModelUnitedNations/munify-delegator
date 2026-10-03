// @vitest-environment node
import { fromDataURL, toDataURL } from '$api/services/fileToDataURL';
import { resolutionTitle, resolutionUpdateData } from '$api/services/resolutionData';
import { groupResolutionsByCommittee } from '$lib/services/resolutionGroups';
import { describe, expect, test } from 'vitest';

describe('fromDataURL', () => {
	test('round-trips a file encoded with toDataURL', async () => {
		const file = new File(['%PDF-1.4 hello'], 'r.pdf', { type: 'application/pdf' });
		const decoded = fromDataURL(await toDataURL(file));
		expect(decoded?.mime).toBe('application/pdf');
		expect(decoded?.bytes.toString('utf-8')).toBe('%PDF-1.4 hello');
	});

	test('decodes non-base64 data and defaults the media type', () => {
		const decoded = fromDataURL('data:,hello%20world');
		expect(decoded?.mime).toBe('application/pdf');
		expect(decoded?.bytes.toString('utf-8')).toBe('hello world');
	});

	test('rejects values that are not data URLs', () => {
		expect(fromDataURL('not a data url')).toBeUndefined();
	});
});

describe('resolutionTitle', () => {
	test('uses the trimmed title', () => {
		expect(resolutionTitle('  GA/1  ', 'ga1.pdf')).toBe('GA/1');
	});

	test('falls back to the file name for blank or missing titles', () => {
		expect(resolutionTitle('   ', 'ga1.pdf')).toBe('ga1.pdf');
		expect(resolutionTitle(null, 'ga1.pdf')).toBe('ga1.pdf');
	});
});

describe('resolutionUpdateData', () => {
	test('leaves omitted fields unchanged', () => {
		expect(resolutionUpdateData({})).toEqual({ title: undefined, committeeId: undefined });
	});

	test('ignores a blank title', () => {
		expect(resolutionUpdateData({ title: '  ' }).title).toBeUndefined();
	});

	test('sets title and committee', () => {
		expect(resolutionUpdateData({ title: ' New ', committeeId: 'c-1' })).toEqual({
			title: 'New',
			committeeId: 'c-1'
		});
	});

	test('clearCommittee wins over a committee id', () => {
		expect(resolutionUpdateData({ committeeId: 'c-1', clearCommittee: true }).committeeId).toBe(
			null
		);
	});
});

describe('groupResolutionsByCommittee', () => {
	const ga = { id: 'ga', name: 'General Assembly', abbreviation: 'GA' };
	const sc = { id: 'sc', name: 'Security Council', abbreviation: 'SC' };

	test('groups by committee, keeps first-seen order and puts untagged last', () => {
		const groups = groupResolutionsByCommittee([
			{ id: '1', committee: null },
			{ id: '2', committee: sc },
			{ id: '3', committee: ga },
			{ id: '4', committee: sc }
		]);
		expect(groups.map((g) => [g.committeeName, g.items.map((r) => r.id)])).toEqual([
			['Security Council (SC)', ['2', '4']],
			['General Assembly (GA)', ['3']],
			[null, ['1']]
		]);
	});

	test('returns no groups for no or missing resolutions', () => {
		expect(groupResolutionsByCommittee([])).toEqual([]);
		expect(groupResolutionsByCommittee(undefined)).toEqual([]);
	});
});
