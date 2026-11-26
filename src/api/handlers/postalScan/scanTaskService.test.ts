// @vitest-environment node
import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { makeSeedUser } from '#api/db/seed-data/user';
import type { ScanTask } from './scanTaskService';

/**
 * The queue on a real database, as its locks are Postgres': runs with `TEST_DATABASE_URL`, a migrated
 * database to write to (what it adds it removes), and is skipped without.
 */
const url = vi.hoisted(() => process.env.TEST_DATABASE_URL);

vi.mock('$app/env/private', () => ({
	DATABASE_URL: url,
	DATABASE_POOL_SIZE: 8,
	LOG_LEVEL: 'silent',
	NODE_ENV: 'test'
}));
vi.mock('$app/env', () => ({ building: false, dev: false }));

const PEOPLE = ['queue-test-a', 'queue-test-b'];
const [a, b] = PEOPLE;
const nobody = new Map<string, number>();

describe.skipIf(!url)('the tasks of delivered scans', () => {
	const load = async () => ({
		...(await import('#api/db/db')),
		...(await import('./scanTaskService'))
	});

	async function clean() {
		const { db, schema } = await load();
		await db.delete(schema.user).where(inArray(schema.user.id, PEOPLE));
		await db.delete(schema.storedFile).where(eq(schema.storedFile.purpose, 'queue-test'));
	}
	beforeEach(async () => {
		await clean();
		const { db, schema } = await load();
		for (const id of PEOPLE) await db.insert(schema.user).values({ ...makeSeedUser(), id });
	});
	afterAll(clean);

	let files = 0;
	async function deliver({ userId, size = 10 }: { userId: string; size?: number }) {
		const { queueDelivery } = await load();
		await queueDelivery({
			deliverer: { userId, accessName: 'Copier' },
			file: { name: 'a.pdf', key: `queue-test-${files++}`, size }
		});
		// told apart by when they came
		await new Promise((done) => setTimeout(done, 5));
	}
	async function storedPage() {
		const { db, schema } = await load();
		const id = `queue-test-page-${files++}`;
		await db
			.insert(schema.storedFile)
			.values({ id, key: id, purpose: 'queue-test', mimeType: 'application/pdf', size: 1 });
		return id;
	}
	async function claim(kinds: ScanTask['kind'][], lastServed = nobody) {
		const { claimTask } = await load();
		return claimTask({ kinds, lastServed });
	}
	async function claimed(...kinds: ScanTask['kind'][]) {
		const task = await claim(kinds);
		if (!task) throw new Error('nothing to claim');
		return task;
	}
	/** A file that was split into so many pages. */
	async function splitInto(pages: number) {
		const { addPage, finishSplit } = await load();
		await deliver({ userId: a });
		const split = await claimed('SPLIT');
		for (let page = 1; page <= pages; page++) {
			await addPage({ deliveryId: split.deliveryId, page, fileId: await storedPage() });
		}
		expect(await finishSplit({ of: split })).toBe(true);
		return split;
	}

	test('counts a person’s own files, gigabytes too', async () => {
		const { countDeliveries } = await load();
		await deliver({ userId: a, size: 5_000_000_000 });
		await deliver({ userId: a, size: 7 });
		await deliver({ userId: b });
		expect(await countDeliveries(a)).toEqual({ files: 2, bytes: 5_000_000_007 });
		expect(await countDeliveries('queue-test-nobody')).toEqual({ files: 0, bytes: 0 });
	});

	test('takes a file through: split, page by page, and finished after the last', async () => {
		const { finishPage, hasPagesLeft, removeDelivery, resultsOf, lastSplitPage } = await load();
		const split = await splitInto(2);
		expect([split.fileName, split.accessName, split.userId]).toEqual(['a.pdf', 'Copier', a]);
		expect(await lastSplitPage(split.deliveryId)).toBe(2);
		expect(await claim(['SPLIT'])).toBeUndefined();

		const first = await claimed('PAGE');
		expect([first.page, first.pageKey]).toEqual([1, first.fileId]);
		await finishPage({ of: first, result: { ignored: 'noCode' } });
		expect(await hasPagesLeft(split.deliveryId)).toBe(true);
		const second = await claimed('PAGE');
		const problem = { reason: 'otherCode' as const };
		await finishPage({ of: second, result: { problem } });
		expect(await hasPagesLeft(split.deliveryId)).toBe(false);
		expect(await resultsOf(split.deliveryId)).toEqual([
			{ page: 1, ignored: 'noCode' },
			{ page: 2, problem }
		]);
		await removeDelivery(await claimed('FINISH'));
		expect(await claim(['SPLIT', 'PAGE', 'FINISH'])).toBeUndefined();
	});

	test('has a file finished once its last page is done, and not before', async () => {
		const { finishPage } = await load();
		await splitInto(1);
		expect(await claim(['FINISH'])).toBeUndefined();
		await finishPage({ of: await claimed('PAGE'), result: {} });
		expect((await claimed('FINISH')).attempts).toBe(1);
	});

	test('has a file finished at once whose pages were done while it was split', async () => {
		const { addPage, finishSplit } = await load();
		await deliver({ userId: a });
		const split = await claimed('SPLIT');
		await addPage({ deliveryId: split.deliveryId, page: 1, result: { ignored: 'blank' } });
		expect(await finishSplit({ of: split })).toBe(true);
		expect((await claimed('FINISH')).kind).toBe('FINISH');
	});

	test('lets go of a page’s file once it is done, so it is cleaned up where nothing kept it', async () => {
		const { db, schema, finishPage } = await load();
		await splitInto(1);
		const page = await claimed('PAGE');
		expect(page.fileId).not.toBeNull();
		await finishPage({ of: page, result: {} });
		const [row] = await db
			.select({ fileId: schema.scanTask.fileId })
			.from(schema.scanTask)
			.where(eq(schema.scanTask.id, page.id));
		expect(row).toEqual({ fileId: null });
	});

	test('keeps a page once, and what came of one that could not be cut', async () => {
		const { addPage, resultsOf } = await load();
		const split = await splitInto(1);
		const result = { problem: { reason: 'pageUnreadable' as const } };
		await addPage({ deliveryId: split.deliveryId, page: 1, result });
		await addPage({ deliveryId: split.deliveryId, page: 2, result });
		expect(await resultsOf(split.deliveryId)).toEqual([{ page: 1 }, { page: 2, ...result }]);
		expect((await claimed('PAGE')).page).toBe(1);
		expect(await claim(['PAGE'])).toBeUndefined();
	});

	test('gives each task to one process only, however many ask at once', async () => {
		await splitInto(6);
		const claims = await Promise.all(Array.from({ length: 6 }, () => claim(['PAGE'])));
		const pages = claims.flatMap((task) => (task ? [task.page] : []));
		expect(new Set(pages).size).toBe(pages.length);
		expect(pages.length).toBeGreaterThan(0);
		for (let next = await claim(['PAGE']); next; next = await claim(['PAGE'])) {
			pages.push(next.page);
		}
		expect(pages.toSorted()).toEqual([1, 2, 3, 4, 5, 6]);
	});

	test('has people take turns', async () => {
		for (const userId of [a, a, a, b]) await deliver({ userId });
		const served = new Map<string, number>();
		const order: string[] = [];
		for (let turn = 1; turn <= 4; turn++) {
			const task = await claim(['SPLIT'], served);
			if (!task) break;
			served.set(task.userId, turn);
			order.push(task.userId);
		}
		expect(order).toEqual([a, b, a, a]);
	});

	test('lets a hold that ran out be taken over, and its first holder do nothing more', async () => {
		const { db, schema, finishSplit, finishPage, postponeTask, renewHold } = await load();
		await deliver({ userId: a });
		const first = await claimed('SPLIT');
		expect(await claim(['SPLIT'])).toBeUndefined();
		expect(await renewHold(first)).toBe(true);

		await db.update(schema.scanTask).set({ dueAt: new Date(0) });
		const second = await claimed('SPLIT');
		expect([second.id, second.attempts]).toEqual([first.id, 2]);
		expect(await renewHold(first)).toBe(false);
		await postponeTask({ of: first, delayMs: 0 });
		await finishPage({ of: first, result: {} });
		expect(await finishSplit({ of: first })).toBe(false);
		expect(await claim(['SPLIT', 'FINISH'])).toBeUndefined();
		expect(await finishSplit({ of: second })).toBe(true);
	});

	test('counts no attempt that was let go of, and one that failed', async () => {
		const { postponeTask, releaseTask } = await load();
		await deliver({ userId: a });
		await releaseTask({ of: await claimed('SPLIT') });
		const again = await claimed('SPLIT');
		expect(again.attempts).toBe(1);
		await postponeTask({ of: again, delayMs: 60_000 });
		expect(await claim(['SPLIT'])).toBeUndefined();
	});

	test('goes with its owner’s account', async () => {
		const { db, schema } = await load();
		await splitInto(2);
		await db.delete(schema.user).where(eq(schema.user.id, a));
		expect(await claim(['SPLIT', 'PAGE', 'FINISH'])).toBeUndefined();
	});
});
