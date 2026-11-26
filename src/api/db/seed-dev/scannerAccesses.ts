import { createHash } from 'node:crypto';
import type { DevAccountSub } from '../seed-data/devAccounts';
import type { SeedBatch } from './batch';
import { scannerLogin } from './plans';

const DAY_MS = 24 * 60 * 60 * 1000;

/** As `scannerAccessService.ts` stores it: only the SHA-256 of the password. */
const hashPassword = (password: string) => createHash('sha256').update(password).digest('hex');

/**
 * The scanner logins on their owners' profiles: in use, never used, expired, about to expire, and one of
 * somebody who manages no conference's participants (any more), so it delivers nothing. Only
 * `scannerLogin` has a password anybody knows.
 */
export function addScannerAccesses(batch: SeedBatch) {
	const days = (count: number) => new Date(Date.now() + count * DAY_MS);
	const access = ({
		key,
		username = `scan-seed-${key}`,
		password = `unknown ${key}`,
		...login
	}: {
		userId: DevAccountSub;
		key: string;
		name: string;
		expiresAt: Date;
		lastUsedAt: Date | null;
		username?: string;
		password?: string;
	}) =>
		batch.scannerAccess.push({
			...login,
			id: `seed-scanner-${key}`,
			username,
			passwordHash: hashPassword(password)
		});
	access({
		userId: 'dev-team-care',
		key: 'copier',
		name: 'Kopierer Geschäftsstelle',
		...scannerLogin,
		expiresAt: days(150),
		lastUsedAt: days(-5)
	});
	access({
		userId: 'dev-team-care',
		key: 'new',
		name: 'Handscanner',
		expiresAt: days(180),
		lastUsedAt: null
	});
	access({
		userId: 'dev-team-care',
		key: 'expired',
		name: 'Alter Scanner',
		expiresAt: days(-10),
		lastUsedAt: days(-40)
	});
	// the one `SCAN_PROBLEM` mail in the log is about
	access({
		userId: 'dev-team-pm',
		key: 'office',
		name: 'Dokumentenscanner Büro',
		expiresAt: days(3),
		lastUsedAt: days(-2)
	});
	access({
		userId: 'dev-team-member',
		key: 'former',
		name: 'Scanner von früher',
		expiresAt: days(60),
		lastUsedAt: days(-70)
	});
}
