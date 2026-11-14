// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { rowClick } from './rowClick';

function clickOn(target: Element) {
	const event = new MouseEvent('click', { bubbles: true });
	Object.defineProperty(event, 'target', { value: target });
	return event;
}

describe('rowClick', () => {
	afterEach(() => {
		document.body.innerHTML = '';
		window.getSelection()?.removeAllRanges();
	});

	test('opens on a click anywhere in the row', () => {
		document.body.innerHTML = '<table><tr><td><span id="name">A</span></td></tr></table>';
		const open = vi.fn();
		rowClick(open)(clickOn(document.getElementById('name')!));
		expect(open).toHaveBeenCalledOnce();
	});

	test("leaves the row's own controls alone", () => {
		document.body.innerHTML =
			'<table><tr><td><button><span id="icon"></span></button><a id="link" href="#">x</a></td></tr></table>';
		const open = vi.fn();
		rowClick(open)(clickOn(document.getElementById('icon')!));
		rowClick(open)(clickOn(document.getElementById('link')!));
		expect(open).not.toHaveBeenCalled();
	});

	test('does not open when the click selected text', () => {
		document.body.innerHTML = '<table><tr><td><code id="code">ABC123</code></td></tr></table>';
		const code = document.getElementById('code')!;
		const range = document.createRange();
		range.selectNodeContents(code);
		window.getSelection()!.addRange(range);
		const open = vi.fn();
		rowClick(open)(clickOn(code));
		expect(open).not.toHaveBeenCalled();
	});
});
