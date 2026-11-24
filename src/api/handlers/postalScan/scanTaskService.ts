import { and, asc, eq, inArray, isNull, lte, max, min, sql, sum } from 'drizzle-orm';
import { db, schema, type Transaction } from '#api/db/db';
import type { Deliverer } from '#api/handlers/scannerAccess/scannerAccessService';
import { nanoid } from '#lib/helpers/nanoid';
import type { PageResult } from '#lib/paperScan/intake/problems';
import { inTurn } from './deliveryTurns';

/**
 * What is to be done for the files scanners delivered (`scanTask`): each is split, each of its pages taken
 * in, and then its owner told. Nothing in the app shows it, so nothing is published.
 *
 * Whoever is at a task holds it under a name of its own (`heldBy`) and renews that. A hold that ran out is
 * anybody's, and whoever lost theirs changes nothing more of it.
 */

/** How long a task is held unless that is renewed: how long one waits whose process died. */
const HOLD_MS = 5 * 60_000;

const task = schema.scanTask;
const delivery = schema.scanDelivery;

export type TaskKind = (typeof task.$inferSelect)['kind'];
type TaskResult = Omit<PageResult, 'page'>;

/** Queues a file that was stored, to be split. */
export async function queueDelivery({
	deliverer: { userId, accessName },
	file
}: {
	deliverer: Pick<Deliverer, 'userId' | 'accessName'>;
	file: { name: string; key: string; size: number };
}) {
	await db.transaction(async (tx) => {
		const id = nanoid();
		const { name: fileName, key, size } = file;
		await tx.insert(delivery).values({ id, userId, accessName, fileName, key, size });
		await tx.insert(task).values({ deliveryId: id, kind: 'SPLIT', dueAt: new Date() });
	});
}

/** How many files of somebody are being taken in, and how large they are together. */
export async function countDeliveries(userId: string) {
	const [waiting] = await db
		.select({ files: sql<number>`count(*)::int`, bytes: sum(delivery.size).mapWith(Number) })
		.from(delivery)
		.where(eq(delivery.userId, userId));
	return { files: waiting?.files ?? 0, bytes: waiting?.bytes ?? 0 };
}

const due = (kinds: readonly TaskKind[]) =>
	and(isNull(task.doneAt), lte(task.dueAt, new Date()), inArray(task.kind, [...kinds]));

/** Holds the next task of somebody, if any is due: of the file that came first, in order. */
async function holdNextOf({ userId, kinds }: { userId: string; kinds: readonly TaskKind[] }) {
	return db.transaction(async (tx) => {
		const [next] = await tx
			.select({ id: task.id })
			.from(task)
			.innerJoin(delivery, eq(delivery.id, task.deliveryId))
			.where(and(due(kinds), eq(delivery.userId, userId)))
			.orderBy(asc(delivery.createdAt), asc(delivery.id), asc(task.page))
			.limit(1)
			.for('update', { of: task, skipLocked: true });
		if (!next) return undefined;
		const heldBy = nanoid();
		await tx
			.update(task)
			.set({ heldBy, attempts: sql`${task.attempts} + 1`, dueAt: new Date(Date.now() + HOLD_MS) })
			.where(eq(task.id, next.id));
		return { id: next.id, heldBy };
	});
}

/**
 * Holds a task that is due, so no other process takes it: of the person whose turn it is (`deliveryTurns`).
 * `undefined` when none is.
 */
export async function claimTask({
	kinds,
	lastServed
}: {
	kinds: readonly TaskKind[];
	lastServed: ReadonlyMap<string, number>;
}) {
	const waiting = await db
		.select({ userId: delivery.userId })
		.from(task)
		.innerJoin(delivery, eq(delivery.id, task.deliveryId))
		.where(due(kinds))
		.groupBy(delivery.userId)
		.orderBy(min(delivery.createdAt));
	for (const userId of inTurn({ people: waiting.map((row) => row.userId), lastServed })) {
		const hold = await holdNextOf({ userId, kinds });
		// its delivery may be gone just now: there may be more behind it
		const claimed = hold && (await loadTask(hold));
		if (claimed) return claimed;
	}
	return undefined;
}

/** A task held, with the file it is of. */
async function loadTask({ id, heldBy }: { id: string; heldBy: string }) {
	const page = schema.storedFile;
	const rows = await db
		.select({
			id: task.id,
			kind: task.kind,
			page: task.page,
			attempts: task.attempts,
			fileId: task.fileId,
			pageKey: page.key,
			pageType: page.mimeType,
			pageName: page.fileName,
			deliveryId: delivery.id,
			userId: delivery.userId,
			accessName: delivery.accessName,
			fileName: delivery.fileName,
			key: delivery.key,
			size: delivery.size
		})
		.from(task)
		.innerJoin(delivery, eq(delivery.id, task.deliveryId))
		.leftJoin(page, eq(page.id, task.fileId))
		.where(eq(task.id, id));
	const row = rows.at(0);
	return row && { ...row, heldBy };
}

export type ScanTask = NonNullable<Awaited<ReturnType<typeof claimTask>>>;

/** A task as held under this name. */
type Held = Pick<ScanTask, 'id' | 'heldBy'>;

const held = ({ id, heldBy }: Held) => and(eq(task.id, id), eq(task.heldBy, heldBy));

/** Holds a task for longer; false once somebody else has it. */
export async function renewHold(of: Held): Promise<boolean> {
	const renewed = await db
		.update(task)
		.set({ dueAt: new Date(Date.now() + HOLD_MS) })
		.where(held(of))
		.returning({ id: task.id });
	return renewed.length > 0;
}

/** Lets go of a task that failed, to be tried again in `delayMs`. */
export async function postponeTask({ of, delayMs }: { of: Held; delayMs: number }) {
	await db
		.update(task)
		.set({ heldBy: null, dueAt: new Date(Date.now() + delayMs) })
		.where(held(of));
}

/** Lets go of a task that was not worked on to the end, which counts for nothing; due again in `delayMs`. */
export async function releaseTask({ of, delayMs = 0 }: { of: Held; delayMs?: number }) {
	await db
		.update(task)
		.set({
			heldBy: null,
			attempts: sql`greatest(${task.attempts} - 1, 0)`,
			dueAt: new Date(Date.now() + delayMs)
		})
		.where(held(of));
}

/** Marks a task done; false when somebody else has it by now. */
async function markDone({ tx, of, result }: { tx: Transaction; of: Held; result?: TaskResult }) {
	const done = await tx
		.update(task)
		.set({ doneAt: new Date(), heldBy: null, fileId: null, result })
		.where(held(of))
		.returning({ id: task.id });
	return done.length > 0;
}

/** Whether pages of a file are still to be taken in. */
export async function hasPagesLeft(deliveryId: string) {
	const [left] = await db
		.select({ id: task.id })
		.from(task)
		.where(and(eq(task.deliveryId, deliveryId), eq(task.kind, 'PAGE'), isNull(task.doneAt)))
		.limit(1);
	return left !== undefined;
}

/** Marks a page done. Once it was the last, what finishes the file is due. */
export async function finishPage({ of, result }: { of: ScanTask; result: TaskResult }) {
	const done = await db.transaction((tx) => markDone({ tx, of, result }));
	if (!done || (await hasPagesLeft(of.deliveryId))) return;
	await db
		.update(task)
		.set({ dueAt: new Date() })
		.where(and(eq(task.deliveryId, of.deliveryId), eq(task.kind, 'FINISH'), isNull(task.heldBy)));
}

/** The last page that was cut out of a file; 0 for none. */
export async function lastSplitPage(deliveryId: string) {
	const [last] = await db
		.select({ page: max(task.page) })
		.from(task)
		.where(and(eq(task.deliveryId, deliveryId), eq(task.kind, 'PAGE')));
	return last?.page ?? 0;
}

/** Queues a page cut out of a file, or records what came of one that could not be. */
export async function addPage({
	deliveryId,
	page,
	...cut
}: {
	deliveryId: string;
	page: number;
} & ({ fileId: string } | { result: TaskResult })) {
	const now = new Date();
	const done = 'result' in cut ? { doneAt: now, result: cut.result } : { fileId: cut.fileId };
	await db
		.insert(task)
		.values({ deliveryId, kind: 'PAGE', page, dueAt: now, ...done })
		.onConflictDoNothing();
}

/** Marks a file as split, with what there is to tell of that; then it is finished once its pages are done. */
export async function finishSplit({ of, result }: { of: ScanTask; result?: TaskResult }) {
	return db.transaction(async (tx) => {
		if (!(await markDone({ tx, of, result }))) return false;
		await tx
			.insert(task)
			.values({ deliveryId: of.deliveryId, kind: 'FINISH', dueAt: new Date() })
			.onConflictDoNothing();
		return true;
	});
}

/** What came of a file, its splitting (page 0) and its pages, as far as there is something to tell. */
export async function resultsOf(deliveryId: string): Promise<PageResult[]> {
	const rows = await db
		.select({ page: task.page, result: task.result })
		.from(task)
		.where(and(eq(task.deliveryId, deliveryId), inArray(task.kind, ['SPLIT', 'PAGE'])))
		.orderBy(asc(task.page));
	return rows.flatMap(({ page, result }) => (page === 0 && !result ? [] : [{ page, ...result }]));
}

/** Removes a file that was taken in, with its tasks. */
export async function removeDelivery(of: ScanTask) {
	await db.delete(delivery).where(eq(delivery.id, of.deliveryId));
}
