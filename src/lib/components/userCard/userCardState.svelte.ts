import { page } from '$app/state';
import { queryParameters } from 'sveltekit-search-params';

/**
 * The open card's user id lives in the `userCard` query parameter. `queryParameters` is the
 * reactive state: a read comes from the URL (so a reload or a shared link opens the card), and a
 * write is held locally at once and written back to the URL, so open and close take effect
 * immediately. History entries are replaced, so the card never leaves one behind.
 *
 * It sets up an effect, so it cannot be created at module level: the one `UserCardDrawer` makes
 * it while it initialises and hands it over here.
 */
export function createUserCardParams() {
	return queryParameters({ userCard: true }, { pushHistory: false });
}

type UserCardParams = ReturnType<typeof createUserCardParams>;

let params = $state.raw<UserCardParams>();

export function registerUserCardParams(created: UserCardParams) {
	params = created;
}

/** The conference is whichever one the current dashboard route belongs to. */
const CONFERENCE_PATH = /^\/dashboard\/([^/]+)/;

export function openUserCard(userId: string) {
	if (params) params.userCard = userId;
}

export function closeUserCard() {
	if (params) params.userCard = null;
}

export function getUserCardState() {
	return {
		get userId() {
			return params?.userCard ?? null;
		},
		get conferenceId() {
			return CONFERENCE_PATH.exec(page.url.pathname)?.[1] ?? null;
		},
		get isOpen() {
			return this.userId !== null && this.conferenceId !== null;
		}
	};
}
