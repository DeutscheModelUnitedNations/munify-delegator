import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadStatsHistory, saveStatsHistory } from './statsHistory';
import type { StatsTypeHistoryEntry } from './stats.svelte';

const entry: StatsTypeHistoryEntry = {
	timestamp: '2026-11-01',
	conferenceId: 'conference-1',
	stats: {
		registered: {
			total: 3,
			applied: 2,
			notApplied: 1,
			supervisors: 0,
			singleParticipants: { byRole: [] }
		}
	}
};

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
});

describe('statsHistory', () => {
	it('reads back what it stored', () => {
		saveStatsHistory([entry]);
		expect(loadStatsHistory()).toEqual([entry]);
	});

	it('starts empty without a stored history', () => {
		expect(loadStatsHistory()).toEqual([]);
	});

	it('reads an unreadable or foreign value as empty', () => {
		localStorage.setItem('statsHistory', '{not json');
		expect(loadStatsHistory()).toEqual([]);
		localStorage.setItem('statsHistory', '{"a":1}');
		expect(loadStatsHistory()).toEqual([]);
	});

	it('does not throw when storage is full', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
		});
		expect(() => saveStatsHistory([entry])).not.toThrow();
	});

	it('does not throw when storage is blocked', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new DOMException('The operation is insecure.', 'SecurityError');
		});
		expect(loadStatsHistory()).toEqual([]);
	});
});
