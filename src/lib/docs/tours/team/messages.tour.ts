import type { Tour } from '@deutschemodelunitednations/docs-kit';
import { m } from '#lib/paraglide/messages';

/**
 * The team inboxes. Anchors live in `#lib/components/chat/` (`chat.*`, shared with the
 * participants' messages page) and in `team/messages/InboxChats.svelte` and `InboxFilter.svelte`; the reports banner, the inbox
 * filter (several inboxes or groups) and "new message" show only when they apply.
 */
export const messagesTour: Tour = {
	id: 'team.messages',
	steps: [
		{
			title: () => m.tourTeamMessagesIntroTitle(),
			body: () => m.tourTeamMessagesIntroBody()
		},
		{
			anchor: 'chat.list',
			title: () => m.tourTeamMessagesListTitle(),
			body: () => m.tourTeamMessagesListBody(),
			side: 'right'
		},
		{
			anchor: 'team.messages.inboxes',
			title: () => m.tourTeamMessagesInboxesTitle(),
			body: () => m.tourTeamMessagesInboxesBody(),
			side: 'right'
		},
		{
			anchor: 'chat.new',
			title: () => m.tourTeamMessagesNewTitle(),
			body: () => m.tourTeamMessagesNewBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.messages.notifications',
			title: () => m.tourTeamMessagesNotificationsTitle(),
			body: () => m.tourTeamMessagesNotificationsBody(),
			side: 'bottom'
		},
		{
			anchor: 'team.messages.reports',
			title: () => m.tourTeamMessagesReportsTitle(),
			body: () => m.tourTeamMessagesReportsBody(),
			side: 'right'
		},
		{
			anchor: 'chat.thread',
			title: () => m.tourTeamMessagesThreadTitle(),
			body: () => m.tourTeamMessagesThreadBody(),
			side: 'left'
		}
	]
};
