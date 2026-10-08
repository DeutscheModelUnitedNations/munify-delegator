import { inArray, sql } from 'drizzle-orm';
import { db, schema } from '$api/db/db';
import { pubsub as rumblePubsub } from '$api/rumble';
import { participatesIn } from './authHelper';
import { DuplicateIndex, type DuplicatePair, type MatchProfile } from './duplicateMatching';

/*
 * Looks for accounts that may belong to the same person, so a care note survives a fresh signup.
 * Advisory only: the care team decides every pair (`possibleDuplicate.status`).
 *
 * TODO(privacy): split the personal data off `user` into a `userData` table, as the AVV app does:
 * `user` keeps the id the 13 restricting foreign keys point at, and deleting an account deletes
 * only its `userData` - today an erasure request needs hand-written SQL. Once that exists, keep a
 * tombstone of a deleted account that carried a care note (keyed hashes of phone, email local part,
 * emergency numbers and birthday + name, with an expiry) and match new accounts against it too.
 * Before building it: the legal basis for keeping notes and fingerprints after an erasure request
 * (Art. 6(1)(f) GDPR), the retention period, what notes may contain, how Art. 15 access requests
 * show them, and a sign-off from the data protection officer.
 *
 * TODO(privacy policy): comparing participants' accounts with each other, and keeping care notes
 * for this purpose, are processing purposes of their own. The privacy policy has to name them,
 * with their legal basis, retention and the right to object, before this goes live.
 */

const pubsub = rumblePubsub({ table: 'possibleDuplicate' });

/** What the matcher reads of an account, and nothing else. */
const PROFILE_COLUMNS = {
	id: true,
	givenName: true,
	familyName: true,
	birthday: true,
	email: true,
	phone: true,
	emergencyContacts: true,
	street: true,
	zip: true,
	country: true
} as const;

/**
 * The accounts a scanned one is compared with: who attended a conference that is over, or has a
 * care note. Accounts that never got that far have no history to lose, and leaving them out keeps
 * the personal data the comparison touches to what it is for.
 */
function loadPool() {
	return db.query.user.findMany({
		columns: PROFILE_COLUMNS,
		where: {
			OR: [
				...participatesIn({ endConference: { lt: new Date() } }).OR,
				{ globalNotes: { isNotNull: true, ne: '' } }
			]
		}
	});
}

/** Which accounts a scan compares: one account, or everyone taking part in a conference. */
type UserFilter = NonNullable<NonNullable<Parameters<typeof db.query.user.findMany>[0]>['where']>;

/** Rows per statement: postgres takes at most 65535 parameters in one. */
const BATCH = 5000;

function batches<T>(items: T[]) {
	const result: T[][] = [];
	for (let i = 0; i < items.length; i += BATCH) result.push(items.slice(i, i + BATCH));
	return result;
}

/**
 * Stores what a scan found: new pairs open, known ones get the fresh score and reasons but keep
 * their decision. An open pair the scan no longer finds is dropped - but only where the scan
 * could have found it, i.e. its other account is in the pool; otherwise it came from scanning that
 * other account, and stays.
 */
async function store(
	scannedWhere: UserFilter,
	scannedIds: Set<string>,
	poolIds: Set<string>,
	pairs: DuplicatePair[]
) {
	const found = new Set(pairs.map((pair) => `${pair.userId}|${pair.candidateId}`));

	await db.transaction(async (tx) => {
		const existing = await tx.query.possibleDuplicate.findMany({
			columns: { id: true, userId: true, candidateId: true },
			where: { status: 'OPEN', OR: [{ user: scannedWhere }, { candidate: scannedWhere }] }
		});
		const stale = existing.filter((row) => {
			if (found.has(`${row.userId}|${row.candidateId}`)) return false;
			const other = scannedIds.has(row.userId) ? row.candidateId : row.userId;
			return poolIds.has(other);
		});
		for (const batch of batches(stale)) {
			await tx.delete(schema.possibleDuplicate).where(
				inArray(
					schema.possibleDuplicate.id,
					batch.map((row) => row.id)
				)
			);
		}

		for (const batch of batches(pairs)) {
			await tx
				.insert(schema.possibleDuplicate)
				.values(batch)
				.onConflictDoUpdate({
					target: [schema.possibleDuplicate.userId, schema.possibleDuplicate.candidateId],
					set: {
						score: sql`excluded.score`,
						reasons: sql`excluded.reasons`,
						updatedAt: sql`CURRENT_TIMESTAMP`
					}
				});
		}
	});

	pubsub.updated();
	return pairs.length;
}

/** How many accounts are indexed or matched before the event loop gets a turn. */
const CHUNK = 2000;

/** Runs `work` over `items` a chunk at a time, letting other requests through in between. */
async function inChunks<T>(items: T[], work: (chunk: T[]) => void) {
	for (let i = 0; i < items.length; i += CHUNK) {
		work(items.slice(i, i + CHUNK));
		await new Promise((resolve) => setImmediate(resolve));
	}
}

async function scan(scannedWhere: UserFilter) {
	const [scanned, pool] = await Promise.all([
		db.query.user.findMany({ columns: PROFILE_COLUMNS, where: scannedWhere }),
		loadPool()
	]);
	const index = new DuplicateIndex();
	await inChunks<MatchProfile>(pool, (chunk) => index.add(chunk));
	await inChunks<MatchProfile>(scanned, (chunk) => index.match(chunk));
	return store(
		scannedWhere,
		new Set(scanned.map((user) => user.id)),
		new Set(pool.map((user) => user.id)),
		index.found()
	);
}

/** Compares everyone taking part in the conference with the pool; answers how many pairs it holds. */
export function scanConferenceForDuplicates(conferenceId: string) {
	return scan(participatesIn({ id: conferenceId }));
}

/**
 * Compares one account with the pool, after it was created or its profile changed. Runs in the
 * background of the request that changed it: a failure is logged, never the request's problem.
 */
export function scanUserForDuplicatesInBackground(userId: string) {
	scan({ id: userId }).catch((error: unknown) => {
		console.error('Scanning an account for possible duplicates failed:', error);
	});
}
