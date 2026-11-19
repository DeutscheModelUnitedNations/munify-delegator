import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The conference's automatic mails. Anchors live in `team/emails/`; the Slack card shows for
 * project management only.
 */
export const emailsTour: Tour = {
	id: 'team.emails',
	steps: [
		{
			title: () => m.tourTeamEmailsIntroTitle(),
			body: () => m.tourTeamEmailsIntroBody()
		},
		{
			anchor: 'team.emails.kind',
			title: () => m.tourTeamEmailsKindTitle(),
			body: () => m.tourTeamEmailsKindBody(),
			side: 'top'
		},
		{
			anchor: 'team.emails.save',
			title: () => m.tourTeamEmailsSaveTitle(),
			body: () => m.tourTeamEmailsSaveBody(),
			side: 'left'
		},
		{
			anchor: 'team.emails.footer',
			title: () => m.tourTeamEmailsFooterTitle(),
			body: () => m.tourTeamEmailsFooterBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.emails.pace',
			title: () => m.tourTeamEmailsPaceTitle(),
			body: () => m.tourTeamEmailsPaceBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.emails.slack',
			title: () => m.tourTeamEmailsSlackTitle(),
			body: () => m.tourTeamEmailsSlackBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.emails.log',
			title: () => m.tourTeamEmailsLogTitle(),
			body: () => m.tourTeamEmailsLogBody(),
			side: 'top'
		}
	]
};
