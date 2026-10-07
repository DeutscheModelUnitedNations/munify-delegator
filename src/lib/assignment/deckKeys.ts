/** Keyboard control of the sighting deck: the arrow keys turn the cards and 1-5 rate, unless somebody types. */

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** Whether the event came from a field the user is typing in. */
export function isTyping(target: EventTarget | null) {
	return (
		target instanceof HTMLElement && (target.isContentEditable || TYPING_TAGS.has(target.tagName))
	);
}

/** The key that jumps to the next application nobody has looked at yet. */
export const NEXT_UNREVIEWED_KEY = 'n';

/** The card a key moves to: the arrows turn the cards, `n` skips to the next unreviewed one. */
export function deckKeyTarget(
	event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'target'>,
	neighbours: { previousId?: string; nextId?: string; unreviewedId?: string }
) {
	if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return undefined;
	const targets: Record<string, string | undefined> = {
		ArrowLeft: neighbours.previousId,
		ArrowRight: neighbours.nextId,
		[NEXT_UNREVIEWED_KEY]: neighbours.unreviewedId
	};
	return targets[event.key];
}

/** The rating a number key stands for (1 to 5), or `undefined` for any other key. */
export function ratingForKey(
	event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'target'>
) {
	if (event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return undefined;
	return /^[1-5]$/.test(event.key) ? Number(event.key) : undefined;
}

/** Whether the key clears the rating: Ctrl + D, or Cmd + D on a Mac. */
export function clearsRatingKey(
	event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'metaKey' | 'target'>
) {
	return (
		event.key.toLowerCase() === 'd' &&
		(event.ctrlKey || event.metaKey) &&
		!event.altKey &&
		!isTyping(event.target)
	);
}
