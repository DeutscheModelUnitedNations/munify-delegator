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

/**
 * The inboxes somebody answers: participant care's for who cares for the participants, a trusted
 * person's two (all of them together, and their own), and one per committee function they hold,
 * by committee.
 */
export function inboxesOf({
	cares,
	functions
}: {
	cares: boolean;
	functions: readonly {
		kind: ChatInbox;
		committeeId?: string | null;
		committee?: { abbreviation: string } | null;
	}[];
}): TeamInbox[] {
	const held = functions
		.flatMap((held) =>
			held.committeeId && held.committee
				? [
						{
							key: inboxKey({ inbox: held.kind, committeeId: held.committeeId }),
							inbox: held.kind,
							committeeAbbreviation: held.committee.abbreviation,
							own: false
						}
					]
				: []
		)
		.sort(
			(a, b) =>
				a.committeeAbbreviation.localeCompare(b.committeeAbbreviation) ||
				a.inbox.localeCompare(b.inbox)
		);
	const care: TeamInbox = {
		key: inboxKey({ inbox: 'PARTICIPANT_CARE' }),
		inbox: 'PARTICIPANT_CARE',
		committeeAbbreviation: null,
		own: false
	};
	const trusted = functions.some((held) => held.kind === 'TRUSTED_PERSON');
	return [...(cares ? [care] : []), ...(trusted ? TRUSTED : []), ...held];
}
