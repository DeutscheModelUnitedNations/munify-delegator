import { describe, expect, test, vi, type Mock } from 'vitest';
import { createPubSub } from 'graphql-yoga';

const fakes = vi.hoisted(() => ({
	tables: [] as { refresh: Mock; stop: () => void }[],
	conferenceWatches: 0
}));

vi.mock('#api/rumble', () => ({
	instanceSignals: createPubSub<{ linkSyncRequested: [request: { at: string }] }>()
}));
vi.mock('#api/pubsub', () => ({ instanceLinkPubsub: { updated: () => undefined } }));
vi.mock('#api/db/db', () => ({
	schema: { instanceLink: {} },
	db: {
		$client: { connect: async () => ({ query: async () => undefined, release: () => undefined }) },
		query: { instanceLink: { findFirst: async () => ({ id: 'link' }) } }
	}
}));
vi.mock('./linkAuth', () => ({
	linkConfig: () => ({ remoteUrl: 'https://chase.example' }),
	linkAccessToken: async () => 'link-token'
}));
vi.mock('./chaseLinkService', () => ({
	syncLinkRow: async () => ({ remoteUrl: 'https://chase.example' })
}));
vi.mock('./resolutionSync', () => ({ syncResolutions: async () => undefined }));
vi.mock('./chaseRemote', () => ({
	createChaseClient: () => ({
		liveQuery: {
			// CHASE lets the link read one conference
			conferences: () =>
				Object.assign(Promise.resolve(undefined), {
					subscribe: (next: (rows: { id: string }[]) => void) => {
						fakes.conferenceWatches++;
						next([{ id: 'conference' }]);
						return () => undefined;
					}
				})
		},
		dispose: () => undefined
	})
}));
vi.mock('./chaseTables', async () => {
	const { vi } = await import('vitest');
	return {
		watchChaseTables: () => {
			const tables = { refresh: vi.fn(), stop: () => undefined };
			fakes.tables.push(tables);
			return tables;
		}
	};
});

const { resumeLinkWorker } = await import('./linkWorker');
const { requestLinkSync } = await import('./linkSync');

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the link worker', () => {
	test('reads every table of CHASE again when a sync is requested on any instance', async () => {
		await resumeLinkWorker();
		await vi.waitFor(() => expect(fakes.tables).toHaveLength(1));
		const [tables] = fakes.tables;
		expect(tables.refresh).not.toHaveBeenCalled();
		const watchesBefore = fakes.conferenceWatches;

		expect(requestLinkSync()).toBe(true);
		await settled();

		expect(tables.refresh).toHaveBeenCalledTimes(1);
		// the list of conferences is asked again too
		expect(fakes.conferenceWatches).toBe(watchesBefore + 1);
	});
});
