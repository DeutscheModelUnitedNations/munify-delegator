import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { findAndHighlightCite } from './citeNavigation';

function container(html: string) {
	const element = document.createElement('div');
	element.innerHTML = html;
	return element;
}

const highlights = (element: HTMLElement) =>
	[...element.querySelectorAll('.cite-highlight')].map((span) => span.textContent);

describe('findAndHighlightCite', () => {
	const scrollIntoView = vi.fn();

	beforeEach(() => {
		vi.useFakeTimers();
		Element.prototype.scrollIntoView = scrollIntoView;
	});

	afterEach(() => {
		vi.useRealTimers();
		scrollIntoView.mockReset();
	});

	test('finds nothing without a container or a search text', () => {
		expect(findAndHighlightCite('text', null)).toEqual({ found: false, matchCount: 0 });
		expect(findAndHighlightCite('  \n ', container('<p>text</p>'))).toEqual({
			found: false,
			matchCount: 0
		});
	});

	test('finds nothing when no block contains the text', () => {
		const element = container('<p>Ganz anderer Inhalt</p><span>gesucht</span>');
		expect(findAndHighlightCite('gesucht', element)).toEqual({ found: false, matchCount: 0 });
		expect(scrollIntoView).not.toHaveBeenCalled();
	});

	test('highlights every match, scrolls to the first and clears them again later', () => {
		const element = container(
			'<p>Die Resolution fordert,</p><li>Nichts</li><h2>Sie fordert</h2><li>und fordert erneut.</li>'
		);
		expect(findAndHighlightCite('fordert', element)).toEqual({ found: true, matchCount: 3 });
		expect(highlights(element)).toEqual(['fordert', 'fordert', 'fordert']);
		expect(scrollIntoView).toHaveBeenCalledOnce();
		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });

		vi.advanceTimersByTime(2000);
		expect(highlights(element)).toEqual([]);
		expect(element.querySelector('p')?.textContent).toBe('Die Resolution fordert,');
		expect(element.querySelector('p')?.childNodes).toHaveLength(1);
	});

	test('clears the highlights of an earlier search first', () => {
		const element = container('<p>alpha beta</p>');
		findAndHighlightCite('alpha', element);
		expect(findAndHighlightCite('beta', element)).toEqual({ found: true, matchCount: 1 });
		expect(highlights(element)).toEqual(['beta']);
	});

	test('matches across collapsed whitespace and keeps the original spacing', () => {
		const element = container('<p>Die   Generalversammlung\n  beschließt</p>');
		expect(findAndHighlightCite('Generalversammlung   beschließt', element)).toEqual({
			found: true,
			matchCount: 1
		});
		expect(highlights(element)).toEqual(['Generalversammlung\n  beschließt']);
	});

	test('highlights the matching part of each text node a match spans', () => {
		const element = container('<p>erst <b>fett</b> dann</p>');
		expect(findAndHighlightCite('st fett da', element)).toEqual({ found: true, matchCount: 3 });
		expect(highlights(element)).toEqual(['st ', 'fett', ' da']);
	});

	test('finds clauses of the resolution editor', () => {
		const element = container(
			'<div data-type="operative-clause">ersucht den Generalsekretär</div><div>ersucht nicht</div>'
		);
		expect(findAndHighlightCite('ersucht', element).matchCount).toBe(1);
	});

	test('skips a match it cannot wrap', () => {
		const element = container('<p>Text</p>');
		const surround = vi.spyOn(Range.prototype, 'surroundContents').mockImplementation(() => {
			throw new Error('partially selected node');
		});
		expect(findAndHighlightCite('Text', element)).toEqual({ found: false, matchCount: 0 });
		surround.mockRestore();
	});
});
