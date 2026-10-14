import { count, lt } from 'drizzle-orm';
import { db, schema } from './db';
import { DEFAULT_RETENTION_DAYS, retentionCutoff } from './retention';

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
	const expired = lt(schema.teamMemberInvitation.expiresAt, retentionCutoff(now, retentionDays));

	if (dryRun) {
		const [{ total }] = await db
			.select({ total: count() })
			.from(schema.teamMemberInvitation)
			.where(expired);
		console.info(`${total} expired invitations would be deleted (dry run)`);
		return total;
	}

	const deleted = await db
		.delete(schema.teamMemberInvitation)
		.where(expired)
		.returning({ id: schema.teamMemberInvitation.id });
	console.info(`${deleted.length} expired invitations deleted`);
	return deleted.length;
}
