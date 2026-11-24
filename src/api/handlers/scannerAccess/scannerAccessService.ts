import { createHash, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { customAlphabet } from 'nanoid';
import { z } from 'zod';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { db, schema } from '#api/db/db';
import { scannerAccessPubsub } from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/** What a login is called: the device it is typed into. */
export const scannerNameSchema = z.string().trim().min(1).max(60);

/** How long a login works before its owner renews it: a season of letters, and a bit. */
const VALID_DAYS = 180;
const expiry = () => new Date(Date.now() + VALID_DAYS * 24 * 60 * 60_000);

/** How many logins somebody may have, one for each device. */
const MAX_ACCESSES = 25;

/**
 * What is typed on a device's keypad: no letter or digit taken for another, no capitals. Sixteen of
 * them are 79 random bits, which nobody guesses, so wrong passwords need no limit.
 */
const keypadText = customAlphabet('abcdefghjkmnpqrstuvwxyz23456789');
const USERNAME_LENGTH = 8;
const PASSWORD_LENGTH = 16;

const hashOf = (password: string) => createHash('sha256').update(password).digest('hex');

/** Announces a changed login to the lists of them, which listen to any: they are no rows of their own. */
const announceChange = () => scannerAccessPubsub.updated();

/** Somebody's logins, the newest first. */
export async function scannerAccessesOf(userId: string) {
	return db.query.scannerAccess.findMany({
		where: { userId },
		columns: { id: true, name: true, username: true, lastUsedAt: true, expiresAt: true },
		orderBy: { createdAt: 'desc' }
	});
}

/** Makes a login. Its password is answered here and never again. CONFLICT once there are too many. */
export async function createScannerAccess({ userId, name }: { userId: string; name: string }) {
	const existing = await db.$count(schema.scannerAccess, eq(schema.scannerAccess.userId, userId));
	if (existing >= MAX_ACCESSES) {
		throw apiError({ code: 'CONFLICT', message: m.scannerAccessTooMany({ max: MAX_ACCESSES }) });
	}
	const password = keypadText(PASSWORD_LENGTH);
	const row = await db
		.insert(schema.scannerAccess)
		.values({
			userId,
			name,
			username: `scan-${keypadText(USERNAME_LENGTH)}`,
			passwordHash: hashOf(password),
			expiresAt: expiry()
		})
		.returning({ id: schema.scannerAccess.id, username: schema.scannerAccess.username })
		.then(assertFirstEntryExists);
	scannerAccessPubsub.created();
	return { ...row, name, password };
}

/** Lets a login work for as long again, its password unchanged. */
export async function renewScannerAccess(id: string) {
	await db
		.update(schema.scannerAccess)
		.set({ expiresAt: expiry() })
		.where(eq(schema.scannerAccess.id, id));
	announceChange();
}

export async function deleteScannerAccess(id: string) {
	await db.delete(schema.scannerAccess).where(eq(schema.scannerAccess.id, id));
	scannerAccessPubsub.removed();
}

/** Whose login a scanner signed in with. */
export interface Deliverer {
	accessId: string;
	accessName: string;
	userId: string;
	expiresAt: Date;
}

/** A login and whose it is, as they are now; `undefined` once it was removed. */
async function loadDeliverer(where: { id: string } | { username: string }) {
	const access = await db.query.scannerAccess.findFirst({
		where,
		columns: { id: true, name: true, userId: true, passwordHash: true, expiresAt: true }
	});
	if (!access) return undefined;
	const { id, name, userId, passwordHash, expiresAt } = access;
	const deliverer: Deliverer = { accessId: id, accessName: name, userId, expiresAt };
	return { deliverer, passwordHash };
}

/** Whose login it is; `undefined` for an unknown one or a wrong password. */
export async function findDeliverer({
	username,
	password
}: {
	username: string;
	password: string;
}): Promise<Deliverer | undefined> {
	const found = await loadDeliverer({ username: username.trim().toLowerCase() });
	if (!found) return undefined;
	const given = Buffer.from(hashOf(password));
	const stored = Buffer.from(found.passwordHash);
	if (given.length !== stored.length || !timingSafeEqual(given, stored)) return undefined;
	return found.deliverer;
}

/** A login that signed in before, as it is now. */
export async function currentDeliverer(accessId: string): Promise<Deliverer | undefined> {
	return (await loadDeliverer({ id: accessId }))?.deliverer;
}

/** Notes that a login delivered something. */
export async function noteDelivery(accessId: string) {
	await db
		.update(schema.scannerAccess)
		.set({ lastUsedAt: new Date() })
		.where(eq(schema.scannerAccess.id, accessId));
	announceChange();
}
