import { eq } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import { logger } from '#lib/logger';
import { slackUserIdOfEmail } from './slackApi';
import { decryptSlackToken } from './slackToken';

/**
 * Who a user is in a Slack workspace: found by their account's address, nothing else. The answer
 * is kept (`slackUserLookup`) and asked again when their address changed or the answer got old:
 * somebody not found may have joined the workspace since.
 */

const HOUR = 60 * 60 * 1000;
/** How long an answer holds: somebody found for a month, somebody unknown for an hour. */
const FOUND_FOR = 30 * 24 * HOUR;
const UNKNOWN_FOR = HOUR;

export type SlackConnection = 'CONNECTED' | 'NOT_FOUND' | 'UNAVAILABLE';

type Workspace = Pick<typeof schema.slackWorkspace.$inferSelect, 'id' | 'botTokenCiphertext'>;

/** Whether a kept answer still holds for the address at `now`. */
export function lookupIsFresh({
	lookup,
	email,
	now
}: {
	lookup: { lookedUpEmail: string; slackUserId: string | null; checkedAt: Date } | undefined;
	email: string;
	now: Date;
}) {
	if (!lookup || lookup.lookedUpEmail !== email) return false;
	const holds = lookup.slackUserId ? FOUND_FOR : UNKNOWN_FOR;
	return now.getTime() - lookup.checkedAt.getTime() < holds;
}

/**
 * The user's id in the workspace and how the lookup went: `UNAVAILABLE` when Slack could not be
 * asked (a revoked token, the network), which is logged and never kept.
 */
export async function slackUserOf({
	workspace,
	user,
	now = new Date()
}: {
	workspace: Workspace;
	user: { id: string; email: string };
	now?: Date;
}): Promise<{ connection: SlackConnection; slackUserId: string | null }> {
	const email = user.email.trim().toLowerCase();
	const lookup = await db.query.slackUserLookup.findFirst({
		where: { slackWorkspaceId: workspace.id, userId: user.id }
	});
	if (lookup && lookupIsFresh({ lookup, email, now })) {
		return {
			connection: lookup.slackUserId ? 'CONNECTED' : 'NOT_FOUND',
			slackUserId: lookup.slackUserId
		};
	}
	let slackUserId: string | null;
	try {
		const token = await decryptSlackToken(workspace.botTokenCiphertext);
		slackUserId = await slackUserIdOfEmail({ token, email });
	} catch (error) {
		logger.error('Looking a user up in Slack failed', { error, slackWorkspaceId: workspace.id });
		return { connection: 'UNAVAILABLE', slackUserId: null };
	}
	const values = { lookedUpEmail: email, slackUserId, checkedAt: now };
	await db
		.insert(schema.slackUserLookup)
		.values({ slackWorkspaceId: workspace.id, userId: user.id, ...values })
		.onConflictDoUpdate({
			target: [schema.slackUserLookup.slackWorkspaceId, schema.slackUserLookup.userId],
			set: { ...values, updatedAt: now }
		});
	return { connection: slackUserId ? 'CONNECTED' : 'NOT_FOUND', slackUserId };
}

/** Forgets what was kept about a workspace's users: its token changed, so everybody is asked again. */
export async function forgetSlackUsers(slackWorkspaceId: string) {
	await db
		.delete(schema.slackUserLookup)
		.where(eq(schema.slackUserLookup.slackWorkspaceId, slackWorkspaceId));
}
