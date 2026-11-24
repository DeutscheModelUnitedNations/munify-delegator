/**
 * What the user card shows beside its side column, named after what participant care does there
 * rather than after the tables behind it. `person` is no tab of the bar: the side column opens it.
 */
const USER_CARD_TABS = [
	'overview',
	'registration',
	'formalities',
	'onSite',
	'papers',
	'history',
	'person'
] as const;

export type UserCardTab = (typeof USER_CARD_TABS)[number];

/** What decides which tabs a person's card offers. */
export interface UserCardTabFlags {
	/** A delegation membership, a single participation or a supervisor registration */
	registered: boolean;
	/** An entry on the conference's waiting list */
	waiting: boolean;
	/** A registration or a team role: something to show about their seat */
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
		overview: flags.holdsPart || flags.waiting,
		registration: flags.holdsPart || flags.waiting,
		formalities: flags.participant,
		onSite: flags.access && (flags.participant || !flags.team),
		papers: flags.delegate,
		history: true,
		person: true
	};
	return USER_CARD_TABS.filter((tab) => shown[tab]);
}

/**
 * The tab to show: the one picked last if this person's card has it (the card stays on its tab
 * when it is pointed at someone else), else the overview, else the person's details.
 */
export function shownUserCardTab({
	picked,
	visible
}: {
	picked: UserCardTab | null;
	visible: readonly UserCardTab[];
}): UserCardTab {
	if (picked && visible.includes(picked)) return picked;
	return visible.includes('overview') ? 'overview' : 'person';
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
