import type { EmailkindEnum } from '#lib/api/rumbleClient/client';
import { fetchOpenEmails, type OpenEmails } from '#lib/api/openEmails';

/**
 * Offers to send the mails an action made due, after it is done: nothing sends on its own, so
 * the team decides right there or later on the e-mail page. Render `EmailPrompt` with it.
 */
export function createEmailPrompt() {
	let offered = $state<{ conferenceId: string; open: OpenEmails[] }>();

	return {
		get offered() {
			return offered;
		},
		/** Asks what of `kinds` is owed, and opens the prompt when anything is. */
		async offer({
			conferenceId,
			kinds
		}: {
			conferenceId: string;
			kinds: readonly EmailkindEnum[];
		}) {
			const open = await fetchOpenEmails({ conferenceId, kinds });
			if (open.length > 0) offered = { conferenceId, open };
		},
		close() {
			offered = undefined;
		}
	};
}

export type EmailPrompt = ReturnType<typeof createEmailPrompt>;
