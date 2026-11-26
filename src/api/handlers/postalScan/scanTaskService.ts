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
/**
 * When a file's FINISH is looked at while pages are still to be done: the last of them makes it due at once,
 * this is for one whose last page was done just while the split ended.
 */
const FINISH_FALLBACK_MS = 5 * 60_000;

/**
 * The database's time `ms` from now. Every time of the queue is the database's, so replicas whose clocks
 * differ take no hold that has not run out.
 */
const inMs = (ms: number) => sql<Date>`now() + make_interval(secs => ${ms / 1000})`;

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
		await tx.insert(task).values({ deliveryId: id, kind: 'SPLIT', dueAt: inMs(0) });
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
	and(isNull(task.doneAt), lte(task.dueAt, sql`now()`), inArray(task.kind, [...kinds]));

const pageFile = schema.storedFile;

/** What a held task is loaded with: the file it is of, and its page's. */
const taskColumns = {
	id: task.id,
	kind: task.kind,
	page: task.page,
	attempts: task.attempts,
	fileId: task.fileId,
	pageKey: pageFile.key,
	pageType: pageFile.mimeType,
	pageName: pageFile.fileName,
	deliveryId: delivery.id,
	userId: delivery.userId,
	accessName: delivery.accessName,
	fileName: delivery.fileName,
	key: delivery.key,
	size: delivery.size
};

/** Holds the next task of somebody, if any is due: of the file that came first, in order. */
async function holdNextOf({ userId, kinds }: { userId: string; kinds: readonly TaskKind[] }) {
	return db.transaction(async (tx) => {
		const [next] = await tx
			.select(taskColumns)
			.from(task)
			.innerJoin(delivery, eq(delivery.id, task.deliveryId))
			.leftJoin(pageFile, eq(pageFile.id, task.fileId))
			.where(and(due(kinds), eq(delivery.userId, userId)))
			.orderBy(asc(delivery.createdAt), asc(delivery.id), asc(task.page))
			.limit(1)
			.for('update', { of: task, skipLocked: true });
		if (!next) return undefined;
		const heldBy = nanoid();
		await tx
			.update(task)
			.set({ heldBy, attempts: sql`${task.attempts} + 1`, dueAt: inMs(HOLD_MS) })
			.where(eq(task.id, next.id));
		return { ...next, attempts: next.attempts + 1, heldBy };
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
		const claimed = await holdNextOf({ userId, kinds });
		if (claimed) return claimed;
	}
	return undefined;
}

export type ScanTask = NonNullable<Awaited<ReturnType<typeof claimTask>>>;

/** A task as held under this name. */
type Held = Pick<ScanTask, 'id' | 'heldBy'>;

const held = ({ id, heldBy }: Held) => and(eq(task.id, id), eq(task.heldBy, heldBy));

/** Holds a task for longer; false once somebody else has it. */
export async function renewHold(of: Held): Promise<boolean> {
	const renewed = await db
		.update(task)
		.set({ dueAt: inMs(HOLD_MS) })
		.where(held(of))
		.returning({ id: task.id });
	return renewed.length > 0;
}

/** Lets go of a task that failed, to be tried again in `delayMs`. */
export async function postponeTask({ of, delayMs }: { of: Held; delayMs: number }) {
	await db
		.update(task)
		.set({ heldBy: null, dueAt: inMs(delayMs) })
		.where(held(of));
}

/** Lets go of a task that was not worked on to the end, which counts for nothing; due again in `delayMs`. */
export async function releaseTask({ of, delayMs = 0 }: { of: Held; delayMs?: number }) {
	await db
		.update(task)
		.set({
			heldBy: null,
			attempts: sql`greatest(${task.attempts} - 1, 0)`,
			dueAt: inMs(delayMs)
		})
		.where(held(of));
}

/** Marks a task done; false when somebody else has it by now. */
async function markDone({ tx, of, result }: { tx: Transaction; of: Held; result?: TaskResult }) {
	const done = await tx
		.update(task)
		.set({ doneAt: sql`now()`, heldBy: null, fileId: null, result })
		.where(held(of))
		.returning({ id: task.id });
	return done.length > 0;
}

/** Whether pages of a file are still to be taken in. */
export async function hasPagesLeft(deliveryId: string, tx: Transaction | typeof db = db) {
	const [left] = await tx
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
		.set({ dueAt: inMs(0) })
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
	const done = 'result' in cut ? { doneAt: inMs(0), result: cut.result } : { fileId: cut.fileId };
	await db
		.insert(task)
		.values({ deliveryId, kind: 'PAGE', page, dueAt: inMs(0), ...done })
		.onConflictDoNothing();
}

/**
 * Marks a file as split, with what there is to tell of that; then it is finished once its pages are done: at
 * once where they are, else when the last is (`finishPage`).
 */
export async function finishSplit({ of, result }: { of: ScanTask; result?: TaskResult }) {
	return db.transaction(async (tx) => {
		if (!(await markDone({ tx, of, result }))) return false;
		const waits = await hasPagesLeft(of.deliveryId, tx);
		await tx
			.insert(task)
			.values({
				deliveryId: of.deliveryId,
				kind: 'FINISH',
				dueAt: inMs(waits ? FINISH_FALLBACK_MS : 0)
			})
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
