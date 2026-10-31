import { count } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import { db, schema } from './db';
import { DEFAULT_RETENTION_DAYS, retentionCutoff } from './retention';
import { logger } from '#lib/logger';

/**
 * Deletes team member invitations that expired more than `retentionDays` ago. Every invitation
 * expires, used and revoked ones included (a re-issue moves the expiry forward), so this one
 * condition covers all of them. The rows hold the invitee's email address.
 *
 * With `dryRun` it only counts. Returns the number of rows affected.
 */
export async function runInvitationCleanup(
	options: { retentionDays?: number; dryRun?: boolean; now?: Date } = {}
): Promise<number> {
	const { retentionDays = DEFAULT_RETENTION_DAYS, dryRun = false, now = new Date() } = options;
	const expired = whereRows({
		table: schema.teamMemberInvitation,
		filter: {
			expiresAt: { lt: retentionCutoff({ now, retentionDays }) }
		}
	});

	if (dryRun) {
		const [{ total }] = await db
			.select({ total: count() })
			.from(schema.teamMemberInvitation)
			.where(expired);
		logger.info('Would delete expired invitations (dry run)', { count: total });
		return total;
	}

	const deleted = await db
		.delete(schema.teamMemberInvitation)
		.where(expired)
		.returning({ id: schema.teamMemberInvitation.id });
	logger.info('Deleted expired invitations', { count: deleted.length });
	return deleted.length;
}
