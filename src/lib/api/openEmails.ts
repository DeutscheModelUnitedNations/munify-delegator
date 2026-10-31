import { client, type EmailkindEnum } from '#lib/api/rumbleClient/client';
import { fetchTeamAccess } from '#lib/api/teamAccess';
import { canManageEmails } from '#lib/helpers/teamAccess';
import { logger } from '#lib/logger';

/** Mails of one kind a conference owes and has not sent. */
export interface OpenEmails {
	kind: EmailkindEnum;
	open: number;
	/** The `send-emails` job sends them on its own. */
	automatic: boolean;
}

/**
 * The kinds among `kinds` with mails the conference owes and has not sent. Empty for a caller who
 * may not send the conference's mails, and when asking fails: it only decides whether to offer.
 */
export async function fetchOpenEmails({
	conferenceId,
	kinds
}: {
	conferenceId: string;
	kinds: readonly EmailkindEnum[];
}): Promise<OpenEmails[]> {
	if (kinds.length === 0) return [];
	try {
		if (!canManageEmails(await fetchTeamAccess(conferenceId))) return [];
		const [counts, settings] = await Promise.all([
			client.query.openEmailCounts({
				__args: { conferenceId, kinds: [...kinds] },
				kind: true,
				open: true
			}),
			client.query.conferenceEmailSettings({
				__args: { where: { conferenceId: { eq: conferenceId }, enabled: { eq: true } } },
				kind: true
			})
		]);
		const automatic = new Set(settings.map((setting) => setting.kind));
		return counts
			.filter((count) => count.open > 0)
			.map((count) => ({
				kind: count.kind,
				open: count.open,
				automatic: automatic.has(count.kind)
			}));
	} catch (error) {
		logger.warn('Asking for the open emails failed', { conferenceId, err: error });
		return [];
	}
}
