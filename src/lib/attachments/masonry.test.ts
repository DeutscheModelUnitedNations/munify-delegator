import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { masonry } from './masonry';

/** What the observers see; the test calls them back. */
const observed = new Set<Element>();
let resized: () => void;
let disconnected: number;

/** Only the parts of a computed style the grid reads; jsdom lays nothing out. */
let columns: string;

const heights = new Map<Element, number>();

type Frame = (time: number) => void;

/** Animation frames wait until the test runs them */
let frames: Frame[] = [];
function nextFrame() {
	const due = frames;
	frames = [];
	due.forEach((callback) => callback(0));
}

function item(height: number, style = '') {
	const element = document.createElement('div');
	element.setAttribute('style', style);
	heights.set(element, height);
	return element;
}

const placeOf = ({ style }: HTMLElement) => `${style.gridColumn || '-'} | ${style.gridRow || '-'}`;

describe('masonry', () => {
	let grid: HTMLElement;
	let stop: ReturnType<typeof masonry>;

	function attach(...items: HTMLElement[]) {
		grid.append(...items);
		stop = masonry(grid);
	}

	beforeEach(() => {
		observed.clear();
		disconnected = 0;
		columns = '100px 100px';
		frames = [];
		vi.stubGlobal('requestAnimationFrame', (callback: Frame) => {
			frames.push(callback);
			return frames.length;
		});
		vi.stubGlobal('cancelAnimationFrame', () => (frames = []));
		grid = document.body.appendChild(document.createElement('div'));
		vi.stubGlobal(
			'ResizeObserver',
			vi.fn(function (callback: () => void) {
				resized = callback;
				return {
					observe: (element: Element) => observed.add(element),
					unobserve: (element: Element) => observed.delete(element),
					disconnect: () => disconnected++
				};
			})
		);
		vi.stubGlobal('getComputedStyle', (element: HTMLElement) => ({
			display: element.style.display,
			gridTemplateColumns: columns,
			columnGap: '10px',
			gridColumnStart: element.classList.contains('full') ? '1' : 'auto',
			gridColumnEnd: element.classList.contains('full') ? '-1' : 'auto'
		}));
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: HTMLElement
		) {
			return new DOMRect(0, 0, 100, heights.get(this) ?? 0);
		});
	});

	afterEach(() => {
		stop?.();
		grid.remove();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test('moves items up below the shorter ones above them', () => {
		const [first, second, third] = [item(300), item(100), item(50)];
		attach(first, second, third);
		expect(grid.style.gridAutoRows).toBe('1px');
		expect([first, second, third].map(placeOf)).toEqual([
			'1 | 1 / span 300',
			'2 | 1 / span 100',
			'2 | 111 / span 50'
		]);
	});

	test('reaches through wrappers that are no boxes, and leaves full width to the grid', () => {
		const wrapper = item(0, 'display: contents');
		const wide = item(40);
		wide.className = 'full';
		const inner = item(100);
		wrapper.append(inner);
		attach(wrapper, wide);
		expect([...observed]).toEqual([inner, wide]);
		expect(placeOf(inner)).toBe('1 | 1 / span 100');
		expect(placeOf(wide)).toBe('- | 111 / span 40');
	});

	test('is an ordinary grid in one column', () => {
		const only = item(100);
		attach(only);
		columns = '100px';
		resized();
		nextFrame();
		expect(placeOf(only)).toBe('- | -');
		expect(grid.style.gridAutoRows).toBe('');
	});

	test('follows items that come and go', async () => {
		const [first, second] = [item(100), item(100)];
		attach(first);
		grid.append(second);
		await vi.waitFor(() => expect(frames).toHaveLength(1));
		nextFrame();
		expect([...observed]).toEqual([first, second]);
		expect(placeOf(second)).toBe('2 | 1 / span 100');

		first.remove();
		await vi.waitFor(() => expect(frames).toHaveLength(1));
		nextFrame();
		expect([...observed]).toEqual([second]);
		expect(placeOf(first)).toBe('- | -');
		expect(placeOf(second)).toBe('1 | 1 / span 100');
	});

	test('leaves everything in place while its items stay the same', async () => {
		const only = item(100);
		attach(only);
		only.style.gridRow = '7';
		only.append('text');
		await new Promise((done) => setTimeout(done));
		nextFrame();
		expect(placeOf(only)).toBe('1 | 7');
	});

	test('measures new items once the DOM settled, not while it is being changed', async () => {
		const [first, second] = [item(100), item(100)];
		attach(first, second);
		// Mid-update an item can measure nothing for a moment; it is back before the next frame,
		// so the ResizeObserver has nothing to tell
		const tile = item(0);
		grid.prepend(tile);
		await new Promise((done) => setTimeout(done));
		heights.set(tile, 120);
		nextFrame();
		expect([tile, first, second].map(placeOf)).toEqual([
			'1 | 1 / span 120',
			'2 | 1 / span 100',
			'1 | 131 / span 100'
		]);
	});

	test('stops watching once it is taken off', () => {
		attach(item(100));
		stop?.();
		expect(disconnected).toBe(1);
		stop = undefined;
	});
});
