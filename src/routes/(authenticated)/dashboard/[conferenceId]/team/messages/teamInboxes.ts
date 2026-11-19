import type { ChatInbox } from '#lib/helpers/chat';

/** A team inbox the caller answers, with the key the page filters its chats by. */
export interface TeamInbox {
	key: string;
	inbox: ChatInbox;
	committeeAbbreviation: string | null;
	/** A trusted person's own inbox: the chats written to them alone */
	own: boolean;
}

/**
 * What tells the inboxes apart: the kind, the committee of a chairs' or consultants' one, and for
 * a trusted person whether a chat is written to all of them or to them alone.
 */
export function inboxKey({
	inbox,
	committeeId,
	trustedPersonName
}: {
	inbox?: ChatInbox | null;
	committeeId?: string | null;
	/** Set on a chat with one trusted person, which only that person reads */
	trustedPersonName?: string | null;
}) {
	if (inbox === 'PARTICIPANT_CARE') return inbox;
	if (inbox === 'TRUSTED_PERSON') return trustedPersonName ? `${inbox}:own` : inbox;
	return `${inbox ?? ''}:${committeeId ?? ''}`;
}

const TRUSTED: TeamInbox[] = [
	{ key: 'TRUSTED_PERSON', inbox: 'TRUSTED_PERSON', committeeAbbreviation: null, own: false },
	{ key: 'TRUSTED_PERSON:own', inbox: 'TRUSTED_PERSON', committeeAbbreviation: null, own: true }
];

/** The inboxes every committee has. */
const COMMITTEE_INBOXES: readonly ChatInbox[] = ['CHAIR', 'CONSULTANT'];

type CommitteeInbox = TeamInbox & { committeeAbbreviation: string };

const byCommittee = (a: CommitteeInbox, b: CommitteeInbox) =>
	a.committeeAbbreviation.localeCompare(b.committeeAbbreviation) || a.inbox.localeCompare(b.inbox);

const committeeInbox = ({
	kind,
	committee
}: {
	kind: ChatInbox;
	committee: { id: string; abbreviation: string };
}): CommitteeInbox => ({
	key: inboxKey({ inbox: kind, committeeId: committee.id }),
	inbox: kind,
	committeeAbbreviation: committee.abbreviation,
	own: false
});

/**
 * The inboxes somebody answers: participant care's for who cares for the participants, a trusted
 * person's two (all of them together, and their own), and one per committee function they hold,
 * by committee. A system admin reads every inbox but the trusted persons': participant care's
 * and the chairs' and consultants' of every committee.
 */
export function inboxesOf({
	cares,
	functions,
	isAdmin = false,
	committees = []
}: {
	cares: boolean;
	functions: readonly {
		kind: ChatInbox;
		committeeId?: string | null;
		committee?: { abbreviation: string } | null;
	}[];
	isAdmin?: boolean;
	/** The conference's committees: an admin reads the inboxes of all of them */
	committees?: readonly { id: string; abbreviation: string }[];
}): TeamInbox[] {
	const held = isAdmin
		? committees.flatMap((committee) =>
				COMMITTEE_INBOXES.map((kind) => committeeInbox({ kind, committee }))
			)
		: functions.flatMap((held) =>
				held.committeeId && held.committee
					? [
							committeeInbox({
								kind: held.kind,
								committee: { id: held.committeeId, abbreviation: held.committee.abbreviation }
							})
						]
					: []
			);
	const care: TeamInbox = {
		key: inboxKey({ inbox: 'PARTICIPANT_CARE' }),
		inbox: 'PARTICIPANT_CARE',
		committeeAbbreviation: null,
		own: false
	};
	const trusted = functions.some((held) => held.kind === 'TRUSTED_PERSON');
	return [...(cares ? [care] : []), ...(trusted ? TRUSTED : []), ...held.sort(byCommittee)];
}

/** How much of each inbox is unread, by its key. */
export function unreadByInbox(
	chats: readonly {
		inbox?: ChatInbox | null;
		committeeId?: string | null;
		trustedPersonName?: string | null;
		unreadCount: number;
	}[]
) {
	const unread = new Map<string, number>();
	for (const chat of chats) {
		const key = inboxKey(chat);
		unread.set(key, (unread.get(key) ?? 0) + chat.unreadCount);
	}
	return unread;
}

/**
 * An inbox's chats as its list shows them: the open ones, and with the archive shown the archived
 * ones after them. `archived` counts the ones put away, shown or not.
 */
export function listedChats<T extends { archived: boolean }>({
	chats,
	showArchive
}: {
	chats: readonly T[];
	showArchive: boolean;
}) {
	const open = chats.filter((chat) => !chat.archived);
	const archived = chats.filter((chat) => chat.archived);
	return { chats: showArchive ? [...open, ...archived] : open, archived: archived.length };
}
