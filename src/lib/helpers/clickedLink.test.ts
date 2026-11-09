import { describe, expect, it } from 'vitest';
import { clickedLink } from './clickedLink';

function clickOn(element: EventTarget) {
	const event = new MouseEvent('click', { bubbles: true });
	Object.defineProperty(event, 'target', { value: element });
	return event;
}

describe('clickedLink', () => {
	it('is true on a link and on anything inside one', () => {
		const link = document.createElement('a');
		const inner = document.createElement('span');
		link.append(inner);
		expect(clickedLink(clickOn(link))).toBe(true);
		expect(clickedLink(clickOn(inner))).toBe(true);
	});

	it('is false elsewhere in the row', () => {
		expect(clickedLink(clickOn(document.createElement('td')))).toBe(false);
		expect(clickedLink(clickOn(window))).toBe(false);
	});
});
