import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { StoredReadings } from '#lib/paperScan/intake/rescan';

interface StoredScan {
	id: string;
	readings: StoredReadings;
}

const { state, writes, published, tx, verifyCode, forgetScannedDetails } = vi.hoisted(() => {
	const state: {
		/** The scan of the page kept already. */
		known: StoredScan | undefined;
		/** The scan to delete, until something deletes it. */
		scan: { conferenceParticipantId: string } | undefined;
		removed: { readings: StoredReadings }[];
	} = { known: undefined, scan: undefined, removed: [] };
	/** What the transaction wrote, in order. */
	const writes: object[] = [];
	const published: string[] = [];
	const locked = { for: async () => writes.push({ lock: true }) };
	const tx = {
		query: {
			postalScan: {
				findFirst: async ({ where }: { where: { pageKey?: string } }) =>
					where.pageKey ? state.known : state.scan,
				findMany: async () => []
			},
			agreementDetail: {
				findMany: async () => [{ field: 'termsSignature', state: 'yes', source: 'SCAN' }]
			}
		},
		select: () => ({ from: () => ({ where: () => locked }) }),
		insert: () => ({ values: async (insert: object) => writes.push({ insert }) }),
		update: () => ({ set: (set: object) => ({ where: async () => writes.push({ set }) }) }),
		delete: () => ({ where: () => ({ returning: async () => state.removed }) })
	};
	return { state, writes, published, tx, verifyCode: vi.fn(), forgetScannedDetails: vi.fn() };
});

vi.mock('#api/db/db', async () => ({
	db: { transaction: (run: (t: typeof tx) => unknown) => run(tx), query: tx.query },
	schema: await import('#api/db/schema/index')
}));
vi.mock('#api/pubsub', () => ({
	agreementDetailPubsub: { removed: () => published.push('details') },
	postalScanPubsub: {
		created: () => published.push('created'),
		updated: (id: string) => published.push(`updated ${id}`),
		removed: () => published.push('removed')
	},
	storedFilePubsub: { updated: (id: string) => published.push(id) }
}));
vi.mock('#api/handlers/agreementDetail/agreementDetailService', async () => ({
	forgetScannedDetails,
	paperReadingsSchema: (await import('zod')).z.unknown()
}));
vi.mock('#api/handlers/signedCode/signedCodeService', () => ({ verifyCode }));
vi.mock('#lib/paperScan/readScan', () => ({
	fieldsOfCode: (code: string) => (code === 'blank' ? [] : ['termsSignature'])
}));

const { deletePostalScan, importArgsSchema, keepPostalScan, printedPage } =
	await import('./postalScanService');

const refused = { extensions: { code: 'INVALID_INPUT' } };

beforeEach(() => {
	vi.clearAllMocks();
	Object.assign(state, { known: undefined, scan: undefined, removed: [] });
	writes.length = 0;
	published.length = 0;
});

describe('importArgsSchema', () => {
	const args = (source: string) => ({ source, contentKey: `${'a'.repeat(64)}:1` });

	test.each(['UPLOAD', 'FOLDER', 'CAMERA'])('takes a scan the app brings (%s)', (source) => {
		expect(importArgsSchema.safeParse(args(source)).success).toBe(true);
	});

	test('leaves what scanners deliver to them', () => {
		expect(importArgsSchema.safeParse(args('WEBDAV')).success).toBe(false);
	});
});

describe('printedPage', () => {
	const page = (code?: string | null) =>
		printedPage({ code, contentKey: 'hash:1', conferenceId: 'conference', userId: 'ada' });
	const claims = { kind: 'print', conferenceId: 'conference', userId: 'ada' };
	const verified = (claimed: object, code = 'signed') =>
		verifyCode.mockResolvedValue({ valid: true, code, claims: { ...claims, ...claimed } });

	test.each([undefined, null, ''])('goes by the file without a code (%j)', async (code) => {
		expect(await page(code)).toEqual({ pageKey: 'file:hash:1', fields: [] });
		expect(verifyCode).not.toHaveBeenCalled();
	});

	test('goes by the code of the documents, with the fields on it', async () => {
		verified({});
		expect(await page('text')).toEqual({
			pageKey: expect.stringMatching(/^code:[0-9a-f]{64}$/),
			fields: ['termsSignature']
		});
	});

	test('goes by the file for a code without fields', async () => {
		verified({}, 'blank');
		expect(await page('text')).toEqual({ pageKey: 'file:hash:1', fields: [] });
	});

	test('refuses a code that is not genuine', async () => {
		verifyCode.mockResolvedValue({ valid: false, reason: 'forged' });
		await expect(page('text')).rejects.toMatchObject(refused);
	});

	test.each([{ kind: 'identity' }, { conferenceId: 'other' }, { userId: 'bob' }])(
		'refuses a code of something else (%j)',
		async (claimed) => {
			verified(claimed);
			await expect(page('text')).rejects.toMatchObject(refused);
		}
	);
});

describe('keepPostalScan', () => {
	const keep = (readings: StoredReadings) =>
		keepPostalScan({
			conferenceParticipantId: 'participant',
			fileId: 'file',
			source: 'WEBDAV',
			page: { pageKey: 'code:1', fields: ['termsSignature'] },
			readings,
			uploadedById: null
		});
	const signed: StoredReadings = [{ field: 'termsSignature', state: 'yes' }];
	const unsigned: StoredReadings = [{ field: 'termsSignature', state: 'no' }];
	/** Every delivery locks the person first and takes the file from its uploader. */
	const taken = [{ lock: true }, { set: { uploadedById: null } }];

	test('stores a new page', async () => {
		expect(await keep(signed)).toBe('stored');
		expect(writes).toEqual([
			...taken,
			{
				insert: {
					conferenceParticipantId: 'participant',
					fileId: 'file',
					source: 'WEBDAV',
					pageKey: 'code:1',
					fields: ['termsSignature'],
					readings: signed,
					uploadedById: null
				}
			}
		]);
		expect(published).toEqual(['file', 'created']);
	});

	test('replaces a scan that says less', async () => {
		state.known = { id: 'scan', readings: unsigned };
		expect(await keep(signed)).toBe('replaced');
		expect(writes).toEqual([
			...taken,
			{ set: { fileId: 'file', source: 'WEBDAV', readings: signed, uploadedById: null } }
		]);
		expect(published).toEqual(['file', 'updated scan']);
	});

	test.each([
		{ outcome: 'known', known: signed, readings: signed },
		{ outcome: 'differs', known: signed, readings: unsigned }
	])('leaves the scan kept already ($outcome)', async ({ outcome, known, readings }) => {
		state.known = { id: 'scan', readings: known };
		expect(await keep(readings)).toBe(outcome);
		expect(writes).toEqual(taken);
		expect(published).toEqual(['file']);
	});
});

describe('deletePostalScan', () => {
	test('forgets the details only this scan told of', async () => {
		state.scan = { conferenceParticipantId: 'participant' };
		state.removed = [{ readings: [{ field: 'termsSignature', state: 'yes' }] }];
		forgetScannedDetails.mockResolvedValue(true);
		await deletePostalScan('scan');
		expect(forgetScannedDetails).toHaveBeenCalledWith({
			tx,
			participantId: 'participant',
			fields: ['termsSignature']
		});
		expect(published).toEqual(['removed', 'details']);
	});

	test('forgets nothing when there is no scan', async () => {
		await deletePostalScan('scan');
		expect(forgetScannedDetails).not.toHaveBeenCalled();
		expect(published).toEqual(['removed']);
	});

	test('forgets nothing when somebody else deleted it meanwhile', async () => {
		state.scan = { conferenceParticipantId: 'participant' };
		await deletePostalScan('scan');
		expect(forgetScannedDetails).not.toHaveBeenCalled();
	});
});
