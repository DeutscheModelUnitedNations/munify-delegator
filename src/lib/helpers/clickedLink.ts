/**
 * Whether a click landed on a link (or inside one). A clickable table row leaves those to the
 * link, which opens it the way the browser does, new tabs included.
 */
export function clickedLink(event: Event): boolean {
	return event.target instanceof Element && !!event.target.closest('a');
}
