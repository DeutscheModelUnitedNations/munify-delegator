import { m } from '#lib/paraglide/messages';
import { mayOpenTeamRoute, teamRoutes, type TeamRoute } from '#lib/data/teamRoutes';
import type { TeamAccess } from '#lib/helpers/teamAccess';

/**
 * What waits for a team member in a conference, as the team's overview lists it: one line per
 * thing to answer or decide, linking to the page where it is done. Pure, so the order and the
 * rule (nothing shown that is zero, nothing linked the caller may not open) are tested.
 */
export interface WaitingCounts {
	/** Unread messages in the team inboxes the caller answers */
	unreadMessages: number;
	/** Chats between participants reported and not settled (participant care) */
	reportedChats: number;
	/** Possible duplicate accounts nobody decided on */
	openDuplicates: number;
	/** Suggested school merges nobody merged or dismissed */
	schoolSuggestions: number;
	/** Mails the conference owes and does not send on its own */
	openEmails: number;
	/** Announcements not published yet */
	draftAnnouncements: number;
}

export const NOTHING_WAITING: WaitingCounts = {
	unreadMessages: 0,
	reportedChats: 0,
	openDuplicates: 0,
	schoolSuggestions: 0,
	openEmails: 0,
	draftAnnouncements: 0
};

export interface WaitingItem {
	id: keyof WaitingCounts;
	count: number;
	/** The team page where it is done */
	route: TeamRoute;
	/** A query to add to the page's path, to open the right part of it */
	query?: string;
	label: string;
}

const ITEMS: {
	id: keyof WaitingCounts;
	routeId: string;
	query?: string;
	label: (count: number) => string;
}[] = [
	{
		id: 'reportedChats',
		routeId: 'messages',
		query: 'view=reports',
		label: (count) => m.chatReportsWaiting({ count })
	},
	{ id: 'unreadMessages', routeId: 'messages', label: (count) => m.teamWaitingMessages({ count }) },
	{
		id: 'openDuplicates',
		routeId: 'plausibility',
		label: (count) => m.possibleDuplicatesUnreviewed({ count })
	},
	{
		id: 'schoolSuggestions',
		routeId: 'cleanup',
		label: (count) => m.schoolSuggestionsOpen({ count })
	},
	{ id: 'openEmails', routeId: 'emails', label: (count) => m.teamWaitingEmails({ count }) },
	{
		id: 'draftAnnouncements',
		routeId: 'announcement',
		label: (count) => m.teamWaitingDrafts({ count })
	}
];

export function waitingItems({
	counts,
	access
}: {
	counts: WaitingCounts;
	access: TeamAccess;
}): WaitingItem[] {
	return ITEMS.flatMap((item) => {
		const count = counts[item.id];
		const route = teamRoutes.find((entry) => entry.id === item.routeId);
		if (count <= 0 || !route || !mayOpenTeamRoute({ route, access })) return [];
		return [{ id: item.id, count, route, query: item.query, label: item.label(count) }];
	});
}

/** Whether asking for a count makes sense: only for what the caller may open */
export function mayAskFor({ id, access }: { id: keyof WaitingCounts; access: TeamAccess }) {
	const item = ITEMS.find((entry) => entry.id === id);
	const route = teamRoutes.find((entry) => entry.id === item?.routeId);
	return !!route && mayOpenTeamRoute({ route, access });
}
