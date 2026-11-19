import { getContext, setContext } from 'svelte';

/**
 * Whether a conference's pages are shown beside its side navigation, which holds the way back to
 * the overview. Set by the conference's shell; pages that bring their own way back
 * (`BackToDashboard`) leave it out while the menu is there.
 */
interface ConferenceMenu {
	readonly shown: boolean;
}

const key = Symbol('conferenceMenu');

export function setConferenceMenu(menu: ConferenceMenu) {
	setContext(key, menu);
}

const NO_MENU: ConferenceMenu = { shown: false };

/** Read while a component initialises; outside a conference's shell there is no menu */
export function getConferenceMenu(): ConferenceMenu {
	return getContext<ConferenceMenu | undefined>(key) ?? NO_MENU;
}
