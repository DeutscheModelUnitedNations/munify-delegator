import { beforeEach, describe, expect, it, vi } from 'vitest';

const { state, writes, published, tx } = vi.hoisted(() => {
	const state: { mode: string | undefined; scanned: boolean; cardTaken: boolean } = {
		mode: 'BADGE',
		scanned: false,
		cardTaken: false
	};
	/** What the transaction wrote, in order. */
	const writes: object[] = [];
	const published: string[] = [];
	const tx = {
		update: () => ({
			set: (set: object) => ({
				where: async () => {
					if (state.cardTaken) {
						throw Object.assign(new Error('duplicate key'), {
							code: '23505',
							constraint: 'conference_participant_conference_id_access_card_id_key'
						});
					}
					writes.push({ set });
				}
			})
		}),
		insert: () => ({
			values: (insert: object) => {
				writes.push({ insert });
				return { returning: async () => [{ id: 'new' }] };
			}
		})
	};
	return { state, writes, published, tx };
});

vi.mock('#api/db/db', async () => ({
	db: {
		transaction: (run: (t: typeof tx) => unknown) => run(tx),
		query: {
			attendanceEntry: { findFirst: async () => (state.scanned ? { id: 'first' } : undefined) }
		}
	},
	schema: await import('#api/db/schema/index')
}));
vi.mock('#api/db/whereRows', () => ({ whereRows: () => undefined }));
vi.mock('#api/pubsub', () => ({
	attendanceEntryPubsub: { created: () => published.push('entry') },
	attendanceSessionPubsub: { updated: (id: string) => published.push(id) },
	conferenceParticipantPubsub: { updated: (id: string) => published.push(id) }
}));
vi.mock('#api/handlers/conferenceParticipant/conferenceParticipantService', () => ({
	ensureConferenceParticipant: async () => 'participant'
}));
vi.mock('#api/handlers/scanLookup/scanLookupService', () => ({
	sessionModeOf: async () => state.mode,
	checkPassedForScan: async () => (state.mode === 'RECORD' ? null : true)
}));

const { recordScan } = await import('./attendanceEntryService');

const scan = (accessCardId?: string) =>
	recordScan({
		conferenceId: 'conference',
		sessionId: 'session',
		userId: 'user',
		recordedById: 'scanner',
		accessCardId
	});

const refused = (code: string) => ({ extensions: { code } });

beforeEach(() => {
	Object.assign(state, { mode: 'BADGE', scanned: false, cardTaken: false });
	writes.length = 0;
	published.length = 0;
});

describe('recordScan', () => {
	it('stores the card and the scan in a session that hands out cards', async () => {
		expect(await scan('card')).toBe('new');
		expect(writes).toMatchObject([
			{ set: { accessCardId: 'card' } },
			{ insert: { conferenceParticipantId: 'participant', checkPassed: true } }
		]);
		expect(published).toEqual(['participant', 'entry', 'session']);
	});

	it('only replaces the card of somebody scanned already', async () => {
		state.scanned = true;
		expect(await scan('other')).toBe('first');
		expect(writes).toMatchObject([{ set: { accessCardId: 'other' } }]);
		expect(published).toEqual(['participant']);
	});

	it('refuses a card somebody else carries, recording nothing', async () => {
		state.cardTaken = true;
		await expect(scan('taken')).rejects.toMatchObject(refused('CONFLICT'));
		expect(writes).toEqual([]);
		expect(published).toEqual([]);
	});

	it('refuses a scan without a card where cards are handed out', async () => {
		await expect(scan()).rejects.toMatchObject(refused('INVALID_INPUT'));
		expect(writes).toEqual([]);
	});

	it.each(['CHECK', 'RECORD', undefined])('refuses a card in a %s session', async (mode) => {
		state.mode = mode;
		await expect(scan('card')).rejects.toMatchObject(refused('INVALID_INPUT'));
		expect(writes).toEqual([]);
	});

	it.each(['CHECK', 'RECORD'])('records a plain scan in a %s session, once', async (mode) => {
		state.mode = mode;
		expect(await scan()).toBe('new');
		expect(writes).toMatchObject([{ insert: { checkPassed: mode === 'RECORD' ? null : true } }]);

		state.scanned = true;
		await expect(scan()).rejects.toMatchObject(refused('ALREADY_SCANNED'));
	});
});
