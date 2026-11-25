/**
 * What the user card shows beside its side column, named after what participant care does there
 * rather than after the tables behind it.
 */
const USER_CARD_TABS = ['person', 'registration', 'formalities', 'program', 'history'] as const;

export type UserCardTab = (typeof USER_CARD_TABS)[number];

/** What decides which tabs a person's card offers. */
export interface UserCardTabFlags {
	/** A delegation membership, a single participation or a supervisor registration */
	registered: boolean;
	/** An entry on the conference's waiting list */
	waiting: boolean;
	/** The person's `conferenceParticipant` row, which the formalities are stored on */
	participant: boolean;
	/** A confirmed place at the conference (`hasConferenceAccess`) */
	access: boolean;
	team: boolean;
	/** A submitted paper */
	papers: boolean;
	/** No room for the side column's details beside the tabs, so they are one */
	narrow: boolean;
}

/** The tabs a person's card offers, in their order. */
export function visibleUserCardTabs(flags: UserCardTabFlags): UserCardTab[] {
	const shown: Record<UserCardTab, boolean> = {
		person: flags.narrow,
		registration: flags.registered || flags.waiting,
		formalities: flags.participant,
		program: (flags.access && !flags.team) || flags.papers,
		history: true
	};
	return USER_CARD_TABS.filter((tab) => shown[tab]);
}

/**
 * The tab with what the team does with a person at this point: judging the application until they
 * have a place, then settling the formalities and, at the conference, letting them in.
 */
export function openingUserCardTab({
	access,
	participant
}: Pick<UserCardTabFlags, 'access' | 'participant'>): UserCardTab {
	return access && participant ? 'formalities' : 'registration';
}

/**
 * The tab to show: the one picked last if this person's card has it (the card stays on its tab
 * when it is pointed at someone else), else the one to open on, else the first.
 */
export function shownUserCardTab({
	picked,
	opening,
	visible
}: {
	picked: UserCardTab | null;
	/** See `openingUserCardTab` */
	opening: UserCardTab;
	visible: readonly UserCardTab[];
}): UserCardTab {
	const wanted = [picked, opening].find((tab) => tab && visible.includes(tab));
	return wanted ?? visible.at(0) ?? 'history';
}

/**
 * The next tab to load in the background while `shown` is open: of those not `loaded` yet, the
 * nearest to it, the one after it first, since that is where people click next. One at a time, so
 * a card opening does not hit the API with every tab's queries at once.
 */
export function nextUserCardTabToPrefetch({
	visible,
	shown,
	loaded
}: {
	visible: readonly UserCardTab[];
	shown: UserCardTab;
	loaded: ReadonlySet<UserCardTab>;
}): UserCardTab | undefined {
	const from = Math.max(visible.indexOf(shown), 0);
	const byDistance = visible
		.map((tab, index) => ({ tab, distance: index - from }))
		.filter(({ tab }) => tab !== shown && !loaded.has(tab))
		.toSorted((a, b) => Math.abs(a.distance) - Math.abs(b.distance) || b.distance - a.distance);
	return byDistance.at(0)?.tab;
}
