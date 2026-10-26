/**
 * The user card's tabs, named after what participant care does in them rather than after the
 * tables behind them, so every kind of registration finds its data under the same names.
 */
const USER_CARD_TABS = [
	'person',
	'registration',
	'seat',
	'formalities',
	'conference',
	'surveys',
	'papers',
	'history'
] as const;

export type UserCardTab = (typeof USER_CARD_TABS)[number];

/** What decides which tabs a person's card offers. */
export interface UserCardTabFlags {
	/** A delegation membership, a single participation or a supervisor registration */
	registered: boolean;
	/** An entry on the conference's waiting list */
	waiting: boolean;
	/** A registration or a team role: something the seat tab can show */
	holdsPart: boolean;
	/** The person's `conferenceParticipant` row, which the formalities are stored on */
	participant: boolean;
	/** A confirmed place at the conference (`hasConferenceAccess`) */
	access: boolean;
	team: boolean;
	delegate: boolean;
}

/** The tabs a person's card offers, in their order. */
export function visibleUserCardTabs(flags: UserCardTabFlags): UserCardTab[] {
	const shown: Record<UserCardTab, boolean> = {
		person: true,
		registration: flags.registered || flags.waiting,
		seat: flags.holdsPart,
		formalities: flags.participant,
		conference: flags.participant && flags.access,
		surveys: flags.access && !flags.team,
		papers: flags.delegate,
		history: true
	};
	return USER_CARD_TABS.filter((tab) => shown[tab]);
}

type ConferenceState = 'PRE' | 'PARTICIPANT_REGISTRATION' | 'PREPARATION' | 'ACTIVE' | 'POST';

/** Where the work on a person usually is while the conference is in a state. */
const STAGE_TAB: Record<ConferenceState, UserCardTab> = {
	PRE: 'registration',
	PARTICIPANT_REGISTRATION: 'registration',
	PREPARATION: 'formalities',
	ACTIVE: 'conference',
	POST: 'conference'
};

/**
 * The tab to show: the one picked last if this person's card has it (the card stays on its tab
 * when it is pointed at someone else), else the one the conference's state suggests, else the
 * first.
 */
export function shownUserCardTab(
	picked: UserCardTab | null,
	visible: readonly UserCardTab[],
	state: ConferenceState
): UserCardTab {
	if (picked && visible.includes(picked)) return picked;
	const suggested = STAGE_TAB[state];
	return visible.includes(suggested) ? suggested : (visible[0] ?? 'person');
}
