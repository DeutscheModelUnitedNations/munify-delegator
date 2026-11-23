// @vitest-environment node
import { PDFDocument } from 'pdf-lib';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MAX_POSTAL_SCAN_SIZE } from '../limits';
import type { ReadPage } from './pages';
import type { CheckCode } from './people';
import { takeScan, type KeepArgs, type KeptPage } from './takeScan';

const CONFERENCE = 'conf';
const signed = { field: 'termsSignature', state: 'yes' } as const;

const check: CheckCode = async (text) =>
	text === 'forged'
		? { valid: false, reason: 'forged' }
		: {
				valid: true,
				code: text,
				claims: { kind: 'print', userId: text, conferenceId: CONFERENCE, issuedAt: 0 }
			};

const page = (number: number, code?: string, readable = true): ReadPage => ({
	page: number,
	blank: false,
	codes: code ? [{ text: code, readings: readable ? [signed] : null }] : []
});

const read = vi.fn<() => Promise<ReadPage[]>>();
const keep = vi.fn<(args: KeepArgs<string>) => Promise<KeptPage>>();
const onUnreadable = vi.fn();

/** A PDF of three pages, each of another width. */
async function stack() {
	const pdf = await PDFDocument.create();
	[100, 200, 300].forEach((width) => pdf.addPage([width, 300]));
	return new Uint8Array(await pdf.save());
}

const take = async (bytes?: Uint8Array<ArrayBuffer>, owner?: string) =>
	takeScan({
		owner,
		file: { name: 'stack.pdf', bytes: bytes ?? (await stack()) },
		conferenceId: CONFERENCE,
		ports: {
			read,
			check,
			// Carl is registered nowhere
			participants: async (userIds) =>
				new Map(userIds.filter((id) => id !== 'carl').map((id) => [id, `row-${id}`])),
			keep,
			onUnreadable
		}
	});

beforeEach(() => {
	vi.resetAllMocks();
	keep.mockResolvedValue({ outcome: 'stored' });
});

describe('takeScan', () => {
	test('keeps each page for its person, cut out of the file', async () => {
		read.mockResolvedValue([page(1, 'ada'), page(2, 'bob'), page(3, 'ada', false)]);
		const { people, problems } = await take();
		expect(people.map(({ person, kept }) => [person.userId, kept.length])).toEqual([
			['ada', 2],
			['bob', 1]
		]);
		expect(problems).toEqual([{ file: 'stack.pdf', pages: [3], reason: 'unreadable' }]);

		const calls = keep.mock.calls.map(([args]) => args);
		expect(calls.map(({ participant, page: kept }) => [participant, kept.page])).toEqual([
			['row-ada', 1],
			['row-ada', 3],
			['row-bob', 2]
		]);
		expect(calls[0].page.readings).toEqual([signed]);
		const cut = await calls[1].cut();
		expect([cut.name, cut.type]).toEqual(['stack_3.pdf', 'application/pdf']);
		const widths = (await PDFDocument.load(cut.bytes)).getPages().map((each) => each.getWidth());
		expect(widths).toEqual([300]);
	});

	test('names a page of the same file alike, so it is kept once', async () => {
		read.mockResolvedValue([page(1, 'ada'), page(2, 'ada')]);
		const bytes = await stack();
		await take(bytes);
		await take(bytes.slice());
		const keys = keep.mock.calls.map(([args]) => args.pageKey);
		expect(keys.slice(0, 2)).toEqual(keys.slice(2));
		expect(keys[0]).not.toBe(keys[1]);
	});

	test('tells of a page that says something else than the scan kept of it', async () => {
		read.mockResolvedValue([page(1, 'ada'), page(2, 'ada')]);
		keep.mockResolvedValueOnce({ outcome: 'known' }).mockResolvedValueOnce({ outcome: 'differs' });
		expect((await take()).problems).toEqual([{ file: 'stack.pdf', pages: [2], reason: 'differs' }]);
	});

	test("keeps no page of somebody else's for whom the file was said to be of", async () => {
		read.mockResolvedValue([page(1), page(2, 'bob'), page(3, 'ada')]);
		const { problems } = await take(undefined, 'ada');
		expect(keep.mock.calls.map(([args]) => args.page.page)).toEqual([1, 3]);
		expect(problems).toEqual([{ file: 'stack.pdf', pages: [2], reason: 'otherPerson' }]);
	});

	test('keeps nothing of pages that are nobody’s, and says why', async () => {
		read.mockResolvedValue([page(1), page(2, 'forged'), page(3, 'carl')]);
		const { people, problems } = await take();
		expect(keep).not.toHaveBeenCalled();
		expect(people.map(({ person, participant }) => [person.userId, participant])).toEqual([
			['carl', undefined]
		]);
		expect(problems.map(({ reason, pages }) => [reason, pages])).toEqual([
			['noCode', [1]],
			['otherCode', [2]],
			['notRegistered', [3]]
		]);
	});

	test('reads no file that is too large or no scan, and says when one cannot be opened', async () => {
		const reasonOf = async (bytes: Uint8Array<ArrayBuffer>) =>
			(await take(bytes)).problems.map(({ reason }) => reason);
		expect(await reasonOf(new Uint8Array(MAX_POSTAL_SCAN_SIZE + 1))).toEqual(['fileTooLarge']);
		expect(await reasonOf(new TextEncoder().encode('II* a TIFF'))).toEqual(['fileTypeUnknown']);
		expect(read).not.toHaveBeenCalled();
		read.mockRejectedValue(new Error('broken'));
		expect(await reasonOf(await stack())).toEqual(['fileUnreadable']);
		expect(onUnreadable).toHaveBeenCalledOnce();
	});

	test('lets a failure to keep through, so the delivery is tried again', async () => {
		read.mockResolvedValue([page(1, 'ada')]);
		keep.mockRejectedValue(new Error('S3 is down'));
		await expect(take()).rejects.toThrow('S3 is down');
	});
});
