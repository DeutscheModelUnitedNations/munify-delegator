import { beforeEach, describe, expect, test, vi } from 'vitest';

const { set, update, committeeAgendaItemPubsub } = vi.hoisted(() => {
	const where = vi.fn(() => Promise.resolve());
	const set = vi.fn(() => ({ where }));
	return {
		set,
		update: vi.fn(() => ({ set })),
		committeeAgendaItemPubsub: { updated: vi.fn(), created: vi.fn(), removed: vi.fn() }
	};
});
vi.mock('#api/db/db', async () => ({
	db: { update },
	schema: await import('#api/db/schema/index')
}));
vi.mock('#api/pubsub', () => ({ committeeAgendaItemPubsub, paperPubsub: { updated: vi.fn() } }));

const { updateAgendaItem } = await import('./committeeAgendaItemService');

beforeEach(() => vi.clearAllMocks());

describe('updateAgendaItem', () => {
	test('writes only the given fields and announces the agenda item', async () => {
		await updateAgendaItem({ id: 'a1', discussionPoints: ['Eins'], title: null });
		expect(set).toHaveBeenCalledWith({
			title: undefined,
			teaserText: undefined,
			discussionPoints: ['Eins'],
			reviewHelpStatus: undefined
		});
		expect(committeeAgendaItemPubsub.updated).toHaveBeenCalledWith('a1');
	});

	test('clears the points with an empty list', async () => {
		await updateAgendaItem({ id: 'a1', discussionPoints: [] });
		expect(set).toHaveBeenCalledWith(expect.objectContaining({ discussionPoints: [] }));
	});

	test('a save that changed nothing writes and announces nothing', async () => {
		await updateAgendaItem({ id: 'a1', title: null, teaserText: undefined });
		expect(update).not.toHaveBeenCalled();
		expect(committeeAgendaItemPubsub.updated).not.toHaveBeenCalled();
	});
});
