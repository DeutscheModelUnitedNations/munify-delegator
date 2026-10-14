export interface UserSuggestion {
	id: string;
	name: string;
	email: string;
	/** Whether the person takes part in the conference the scanner works for */
	inConference: boolean;
}

/** Whether `text` looks like a user id rather than something to search for: what a scan yields. */
export function looksLikeUserId(text: string) {
	return text.length >= 20 && !/\s/.test(text);
}

/** Whether a user holds any part in the conference the participation lists were asked for. */
export function takesPart(user: {
	delegationMemberships: readonly unknown[];
	singleParticipant: unknown;
	conferenceSupervisor: unknown;
	teamMember: unknown;
	waitingListEntry: unknown;
}) {
	return (
		user.delegationMemberships.length > 0 ||
		!!user.singleParticipant ||
		!!user.conferenceSupervisor ||
		!!user.teamMember ||
		!!user.waitingListEntry
	);
}

/**
 * What a key does to the suggestion list: the arrows move the highlight (wrapping around), Escape
 * closes the list. `undefined` when the key means nothing to an open list.
 */
export function navigateSuggestions(key: string, highlighted: number, count: number) {
	if (count === 0) return undefined;
	if (key === 'ArrowDown') return { highlighted: (highlighted + 1) % count };
	if (key === 'ArrowUp') return { highlighted: (highlighted - 1 + count) % count };
	if (key === 'Escape') return { highlighted: -1, close: true };
	return undefined;
}

/** Enter: the highlighted person, else the code as typed when it is an id, else the best match. */
export function codeToSubmit(
	text: string,
	suggestions: readonly UserSuggestion[],
	highlighted: number
) {
	const trimmed = text.trim();
	if (!trimmed) return undefined;
	const chosen =
		suggestions[highlighted] ?? (looksLikeUserId(trimmed) ? undefined : suggestions[0]);
	return chosen?.id ?? trimmed;
}
