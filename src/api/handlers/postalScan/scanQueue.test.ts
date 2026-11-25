// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { canOpenScans, wake } = vi.hoisted(() => ({ canOpenScans: vi.fn(), wake: vi.fn() }));
vi.mock('$app/env/private', () => ({ SCAN_READERS: 1 }));
vi.mock('#api/services/shutdown', () => ({ beforeShutdown: vi.fn(), isShuttingDown: () => false }));
vi.mock('./scanProcess', () => ({ canOpenScans }));
vi.mock('./scanReader', () => ({ createPageReaders: () => ({ read: vi.fn(), stop: vi.fn() }) }));
vi.mock('./taskLane', () => ({
	createTaskLane: ({ kinds }: { kinds: string[] }) => ({
		wake: () => wake(kinds),
		release: vi.fn()
	})
}));
for (const unused of ['./finishTask', './pageTask', './splitTask', './scanTaskService'] as const) {
	vi.doMock(unused, () => ({}));
}
const { wakeScanQueue } = await import('./scanQueue');

beforeEach(() => vi.resetAllMocks());

describe('wakeScanQueue', () => {
	test('works through the queue where scans may be opened', async () => {
		canOpenScans.mockResolvedValue(true);
		wakeScanQueue();
		await vi.waitFor(() => expect(wake.mock.calls).toEqual([[['SPLIT']], [['PAGE', 'FINISH']]]));
	});

	test('leaves all where they may not, and goes on once they may', async () => {
		canOpenScans.mockResolvedValueOnce(false);
		wakeScanQueue();
		await canOpenScans.mock.results[0].value;
		await Promise.resolve();
		expect(wake).not.toHaveBeenCalled();

		canOpenScans.mockResolvedValueOnce(true);
		wakeScanQueue();
		await vi.waitFor(() => expect(wake).toHaveBeenCalledTimes(2));
	});
});
