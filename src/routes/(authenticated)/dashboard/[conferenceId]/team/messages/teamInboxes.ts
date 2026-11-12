import type { ChatInbox } from '#lib/helpers/chat';

/** A team inbox the caller answers, with the key the page filters its chats by. */
export interface TeamInbox {
	key: string;
	inbox: ChatInbox;
	committeeAbbreviation: string | null;
}

/** What tells the inboxes apart: the kind, and the committee of a chairs' or consultants' one. */
export function inboxKey({
	inbox,
	committeeId
}: {
	inbox?: ChatInbox | null;
	committeeId?: string | null;
}) {
	return inbox === 'PARTICIPANT_CARE' ? inbox : `${inbox ?? ''}:${committeeId ?? ''}`;
}

/**
 * The inboxes somebody answers: participant care's for who cares for the participants, and one
 * per committee function they hold, by committee.
 */
export function inboxesOf({
	cares,
	functions
}: {
	cares: boolean;
	functions: readonly {
		kind: 'CHAIR' | 'CONSULTANT';
		committeeId: string;
		committee: { abbreviation: string };
	}[];
}): TeamInbox[] {
	const held = functions
		.map((held) => ({
			key: inboxKey({ inbox: held.kind, committeeId: held.committeeId }),
			inbox: held.kind,
			committeeAbbreviation: held.committee.abbreviation
		}))
		.sort(
			(a, b) =>
				a.committeeAbbreviation.localeCompare(b.committeeAbbreviation) ||
				a.inbox.localeCompare(b.inbox)
		);
	return [
		...(cares
			? [
					{
						key: inboxKey({ inbox: 'PARTICIPANT_CARE' }),
						inbox: 'PARTICIPANT_CARE' as const,
						committeeAbbreviation: null
					}
				]
			: []),
		...held
	];
}
