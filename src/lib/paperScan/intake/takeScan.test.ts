// @vitest-environment node
import { PDFDocument } from 'pdf-lib';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MAX_POSTAL_SCAN_SIZE, MAX_SCAN_FILE_SIZE } from '../limits';
import type { ReadPage, ScanContent } from './pages';
import type { CheckCode } from './people';
import { bytesSource, type ScanSource } from './source';
import type { KeepArgs, KeptPage } from './takePage';
import { takeScan } from './takeScan';

const CONFERENCE = 'conf';
const signed = { field: 'termsSignature', state: 'yes' } as const;

const check: CheckCode = async (text) =>
	text === 'forged'
		? { valid: false, reason: 'forged' }
		: {
				valid: true,
				code: text,
				// somebody in another conference: `ada@second`
				claims: {
					kind: 'print',
					userId: text.split('@')[0],
					conferenceId: text.split('@')[1] ?? CONFERENCE,
					issuedAt: 0
				}
			};

/** A page as it is read: with this code, or none. */
const page = (code?: string, overrides: Partial<ReadPage> = {}): ReadPage => ({
	page: 1,
	blank: false,
	codes: code ? [{ text: code, readings: [signed] }] : [],
	...overrides
});

const read = vi.fn<(scan: ScanContent) => Promise<ReadPage>>();
const keep = vi.fn<(args: KeepArgs<string>) => Promise<KeptPage>>();
const onUnreadable = vi.fn();
const onPage = vi.fn();

/** A PDF of so many pages, each of another width. */
async function stack(pages = 3) {
	const pdf = await PDFDocument.create();
	for (let number = 1; number <= pages; number++) pdf.addPage([number * 100, 300]);
	return bytesSource(new Uint8Array(await pdf.save()));
}

const take = async ({ source, owner }: { source?: ScanSource; owner?: string } = {}) =>
	takeScan({
		owner: owner === undefined ? undefined : { userId: owner, conferenceId: CONFERENCE },
		file: { name: 'stack.pdf', source: source ?? (await stack()) },
		conferenceIds: new Set([CONFERENCE, 'second']),
		ports: {
			read,
			check,
			// Carl is registered nowhere
			participant: async ({ userId, conferenceId }) =>
				userId === 'carl' ? undefined : `${conferenceId}-${userId}`,
			keep,
			onPage,
			onUnreadable
		}
	});

/** What the pages are read as, one after the other. */
const reads = (...pages: ReadPage[]) => pages.forEach((each) => read.mockResolvedValueOnce(each));
const keptPages = () => keep.mock.calls.map(([args]) => args);

beforeEach(() => {
	vi.resetAllMocks();
	read.mockResolvedValue(page());
	keep.mockResolvedValue({ outcome: 'stored' });
});

describe('takeScan', () => {
	test('keeps each page for its person, as a file of its own', async () => {
		reads(page('ada'), page('bob'), page('ada', { codes: [{ text: 'ada', readings: null }] }));
		const { people, problems } = await take();
		expect(people.map(({ person, kept }) => [person.userId, kept.length])).toEqual([
			['ada', 2],
			['bob', 1]
		]);
		expect(problems).toEqual([
			{ file: 'stack.pdf', pages: [3], reason: 'unreadable', conferenceId: CONFERENCE }
		]);
		const kept = keptPages();
		expect(kept.map(({ participant, page: of }) => [participant, of.page])).toEqual([
			['conf-ada', 1],
			['conf-bob', 2],
			['conf-ada', 3]
		]);
		expect(kept[0].page.readings).toEqual([signed]);
		expect([kept[2].file.name, kept[2].file.type]).toEqual(['stack_3.pdf', 'application/pdf']);
		const own = await PDFDocument.load(kept[2].file.bytes);
		expect(own.getPages().map((each) => each.getWidth())).toEqual([300]);
		expect(onPage).toHaveBeenCalledTimes(3);
	});

	test('has read and kept a page before it cuts the next', async () => {
		const order: string[] = [];
		read.mockImplementation(async () => {
			order.push('read');
			return page('ada');
		});
		keep.mockImplementation(async () => {
			order.push('keep');
			return { outcome: 'stored' };
		});
		await take();
		expect(order).toEqual(['read', 'keep', 'read', 'keep', 'read', 'keep']);
	});

	test('keeps a page with the person’s part in the conference it is of', async () => {
		reads(page('ada'), page('ada@second'), page('carl@second'));
		const { problems, people } = await take();
		expect(keptPages().map(({ participant, conferenceId }) => [participant, conferenceId])).toEqual(
			[
				['conf-ada', CONFERENCE],
				['second-ada', 'second']
			]
		);
		expect(problems).toEqual([
			{ file: 'stack.pdf', pages: [3], reason: 'notRegistered', conferenceId: 'second' }
		]);
		expect(people.at(-1)).toMatchObject({ participant: undefined, kept: [] });
	});

	test('names a page of the same file alike, so it is kept once', async () => {
		read.mockResolvedValue(page('ada'));
		const source = await stack();
		await take({ source });
		await take({ source });
		const keys = keptPages().map(({ pageKey }) => pageKey);
		expect(keys.slice(0, 3)).toEqual(keys.slice(3));
		expect(new Set(keys).size).toBe(3);
	});

	test('tells of a page that says something else than the scan kept of it', async () => {
		reads(page('ada'), page('ada'));
		keep.mockResolvedValueOnce({ outcome: 'known' }).mockResolvedValueOnce({ outcome: 'differs' });
		expect((await take()).problems).toEqual([
			{ file: 'stack.pdf', pages: [2], reason: 'differs', conferenceId: CONFERENCE }
		]);
	});

	test("keeps no page of somebody else's for whom the file was said to be of", async () => {
		reads(page(), page('bob'), page('ada'));
		const { problems } = await take({ owner: 'ada' });
		expect(keptPages().map(({ page: of }) => of.page)).toEqual([1, 3]);
		expect(problems).toEqual([
			{ file: 'stack.pdf', pages: [2], reason: 'otherPerson', conferenceId: CONFERENCE }
		]);
	});

	test('ignores pages without a code, but tells of a file of nothing else', async () => {
		reads(page(), page('ada'), page());
		expect((await take()).problems).toEqual([]);
		expect(keptPages().map(({ page: of }) => of.page)).toEqual([2]);
		expect((await take()).problems).toEqual([{ file: 'stack.pdf', pages: [], reason: 'noCode' }]);
	});

	test('keeps the pages around one that could not be read', async () => {
		reads(page('ada'), page(undefined, { error: 'broken' }), page('bob'));
		const { people, problems } = await take();
		expect(people.map(({ person }) => person.userId)).toEqual(['ada', 'bob']);
		expect(problems).toEqual([{ file: 'stack.pdf', pages: [2], reason: 'pageUnreadable' }]);
	});

	test('takes no file that is too large or no scan, and says when one cannot be opened', async () => {
		const reasonOf = async (bytes: Uint8Array<ArrayBuffer>, size = bytes.length) => {
			const source = { ...bytesSource(bytes), size };
			return (await take({ source })).problems.map(({ reason }) => reason);
		};
		const text = (content: string) => new TextEncoder().encode(content);
		expect(await reasonOf(text('%PDF-1.7'), MAX_SCAN_FILE_SIZE + 1)).toEqual(['fileTooLarge']);
		expect(await reasonOf(new Uint8Array([0xff, 0xd8, 0xff, 0]), MAX_POSTAL_SCAN_SIZE + 1)).toEqual(
			['fileTooLarge']
		);
		expect(await reasonOf(text('II* a TIFF'))).toEqual(['fileTypeUnknown']);
		expect(await reasonOf(text('%PDF-1.7 and nothing else'))).toEqual(['fileUnreadable']);
		expect(onUnreadable).toHaveBeenCalledOnce();
		expect(read).not.toHaveBeenCalled();
	});

	test('takes a picture as a page', async () => {
		read.mockResolvedValue(page('ada'));
		const bytes = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]);
		await take({ source: bytesSource(bytes) });
		expect(keptPages().map(({ file }) => [file.name, file.bytes])).toEqual([['stack.jpg', bytes]]);
	});

	test('lets a failure of reading or keeping through', async () => {
		read.mockRejectedValueOnce(new Error('The process ended'));
		await expect(take()).rejects.toThrow('The process ended');
		read.mockResolvedValue(page('ada'));
		keep.mockRejectedValueOnce(new Error('S3 is down'));
		await expect(take()).rejects.toThrow('S3 is down');
	});
});
