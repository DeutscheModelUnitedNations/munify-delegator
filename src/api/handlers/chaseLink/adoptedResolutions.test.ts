import { describe, expect, it } from 'vitest';
import {
	adoptedResolutions,
	readableResolution,
	resolutionChanges,
	type ChasePaper
} from './adoptedResolutions';

const text = JSON.stringify({ committeeName: 'GA', preamble: [], operative: [] });

const paper = (overrides: Partial<ChasePaper> = {}): ChasePaper => ({
	id: 'paper',
	title: ' Climate ',
	documentNumber: 'GA/1',
	committeeId: 'ga',
	agendaItemId: 'climate',
	vote: { outcome: 'ADOPTED' },
	snapshots: [{ id: 'snap', createdAt: '2027-03-02T10:00:00Z' }],
	...overrides
});

describe('adoptedResolutions', () => {
	it('takes a paper its final vote adopted, with the snapshot of that vote', () => {
		expect(adoptedResolutions([paper()])).toEqual([
			{
				paperId: 'paper',
				snapshotId: 'snap',
				title: 'Climate',
				documentNumber: 'GA/1',
				committeeId: 'ga',
				agendaItemId: 'climate'
			}
		]);
	});

	it('leaves out rejected papers and papers without a vote', () => {
		expect(adoptedResolutions([paper({ vote: { outcome: 'REJECTED' } })])).toEqual([]);
		expect(adoptedResolutions([paper({ vote: null })])).toEqual([]);
	});

	it('leaves out a paper without a snapshot', () => {
		expect(adoptedResolutions([paper({ snapshots: [] })])).toEqual([]);
	});

	it('takes the latest snapshot when the vote was concluded twice', () => {
		const snapshots = [
			{ id: 'old', createdAt: '2027-03-02T10:00:00Z' },
			{ id: 'new', createdAt: '2027-03-02T11:00:00Z' }
		];
		expect(adoptedResolutions([paper({ snapshots })])[0].snapshotId).toBe('new');
	});
});

describe('resolutionChanges', () => {
	const [adopted] = adoptedResolutions([paper()]);

	it('renders a new resolution and one with a newer text, not an unchanged one', () => {
		expect(resolutionChanges({ adopted: [adopted], existing: [] }).render).toEqual([adopted]);
		const stale = [{ id: 'r', chasePaperId: 'paper', chaseSnapshotId: 'older' }];
		expect(resolutionChanges({ adopted: [adopted], existing: stale }).render).toEqual([adopted]);
		const current = [{ id: 'r', chasePaperId: 'paper', chaseSnapshotId: 'snap' }];
		expect(resolutionChanges({ adopted: [adopted], existing: current })).toEqual({
			render: [],
			remove: []
		});
	});

	it('removes resolutions whose paper is no longer adopted', () => {
		const existing = [{ id: 'r', chasePaperId: 'gone', chaseSnapshotId: 'snap' }];
		expect(resolutionChanges({ adopted: [adopted], existing }).remove).toEqual(['r']);
	});
});

describe('readableResolution', () => {
	it('reads a resolution and refuses anything else', () => {
		expect(readableResolution(text)).toEqual({ committeeName: 'GA', preamble: [], operative: [] });
		expect(readableResolution('{')).toBeUndefined();
		expect(readableResolution('{"text":"tiptap"}')).toBeUndefined();
	});
});
