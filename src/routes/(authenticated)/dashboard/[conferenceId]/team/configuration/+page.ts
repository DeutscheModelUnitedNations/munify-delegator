import { redirect } from '@sveltejs/kit';
import { fetchTeamAccess } from '#lib/api/teamAccess';
import { canManageEmails } from '#lib/helpers/teamAccess';
import { emailsPageForLegacyTab } from './legacyEmailsTab';
import type { PageLoad } from './$types';

/**
 * The e-mails were a tab of the settings; links to it (`?tab=emails`) open their own page now.
 * Whoever may not manage the mails stays on the settings, as the tab was hidden from them.
 */
export const load: PageLoad = async ({ url, params }) => {
	const target = emailsPageForLegacyTab(url);
	if (target && canManageEmails(await fetchTeamAccess(params.conferenceId))) {
		redirect(307, target);
	}
};
