/**
 * Attributes that make a non-button element (a card, a header) toggle on click and on Enter,
 * announced as a button. Spread them onto the element: `<div {...toggleButtonProps(toggle)}>`.
 */
export function toggleButtonProps(toggle: () => void) {
	return {
		onclick: toggle,
		onkeypress: (e: KeyboardEvent) => {
			if (e.key === 'Enter') toggle();
		},
		role: 'button',
		tabindex: 0
	};
}
