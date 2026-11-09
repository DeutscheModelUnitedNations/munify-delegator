import { describe, expect, test, vi } from 'vitest';
import { sql } from 'drizzle-orm';

vi.mock('#api/db/db', () => ({ db: {}, schema: new Proxy({}, { get: () => ({}) }) }));

const { assertAllowed } = await import('./utils');
const { db } = await import('#api/db/db');
const { m } = await import('#lib/paraglide/messages');

/** A caller whose ability on every table hands back the filter it was merged with. */
const merged: { action: string; where: object }[] = [];
const ctx = {
	abilities: new Proxy(
		{},
		{
			get: () => ({
				filter: async (action: string) => ({
					merge: (filter: { where: object }) => {
						merged.push({ action, where: filter.where });
						return { sql: { where: undefined } };
					}
				})
			})
		}
	)
};

/** A database whose select finds `rows`. */
function fakeDb(rows: object[]) {
	const chain = {
		from: () => chain,
		where: () => chain,
		limit: async () => rows
	};
	return { select: () => chain };
}

const check = (args: {
	action: 'update' | 'delete';
	found: boolean;
	options?: { extra?: ReturnType<typeof sql>; message?: () => string; inTx?: boolean };
}) => {
	const found = fakeDb(args.found ? [{ found: 1 }] : []);
	const { inTx, ...options } = args.options ?? {};
	if (!inTx) Object.assign(db, found);
	return assertAllowed({
		// TYPE-SAFETY-EXCEPTION: a context and transaction with only what the check reads
		ctx: ctx as never,
		table: 'committee',
		action: args.action,
		id: 'row',
		options: { ...options, tx: inTx ? (found as never) : undefined }
	});
};

const messageOf = (promise: Promise<unknown>) =>
	promise.then(
		() => undefined,
		(error: Error) => error.message
	);

describe('assertAllowed', () => {
	test("passes when the caller's ability reaches the row", async () => {
		merged.length = 0;
		await expect(check({ action: 'update', found: true })).resolves.toBeUndefined();
		await expect(
			check({ action: 'delete', found: true, options: { inTx: true } })
		).resolves.toBeUndefined();
		expect(merged).toEqual([
			{ action: 'update', where: { id: 'row' } },
			{ action: 'delete', where: { id: 'row' } }
		]);
	});

	test('narrows the row by the extra filter when there is one', async () => {
		merged.length = 0;
		const extra = sql`true`;
		await check({ action: 'update', found: true, options: { extra } });
		expect(merged).toEqual([{ action: 'update', where: { id: 'row', RAW: extra } }]);
	});

	test('answers NOT_FOUND worded for the action, or with the message given', async () => {
		expect(await messageOf(check({ action: 'update', found: false }))).toBe(
			m.updateNotFoundOrForbidden()
		);
		expect(await messageOf(check({ action: 'delete', found: false }))).toBe(
			m.deleteNotFoundOrForbidden()
		);
		expect(
			await messageOf(check({ action: 'update', found: false, options: { message: () => 'gone' } }))
		).toBe('gone');
	});
});
