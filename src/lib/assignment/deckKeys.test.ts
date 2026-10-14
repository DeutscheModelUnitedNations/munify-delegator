import { describe, expect, it } from 'vitest';
import { clearsRatingKey, deckKeyTarget, isTyping, ratingForKey } from './deckKeys';

const neighbours = { previousId: 'before', nextId: 'after' };
const press = (key: string, extra: Partial<Parameters<typeof deckKeyTarget>[0]> = {}) => ({
	key,
	altKey: false,
	ctrlKey: false,
	metaKey: false,
	target: null,
	...extra
});

describe('deckKeyTarget', () => {
	it('turns to the neighbour the arrow points at', () => {
		expect(deckKeyTarget(press('ArrowLeft'), neighbours)).toBe('before');
		expect(deckKeyTarget(press('ArrowRight'), neighbours)).toBe('after');
	});

	it('does nothing past either end or for other keys', () => {
		expect(deckKeyTarget(press('ArrowLeft'), { nextId: 'after' })).toBeUndefined();
		expect(deckKeyTarget(press('ArrowRight'), { previousId: 'before' })).toBeUndefined();
		expect(deckKeyTarget(press('a'), neighbours)).toBeUndefined();
	});

	it('leaves browser and editor shortcuts alone', () => {
		expect(deckKeyTarget(press('ArrowLeft', { altKey: true }), neighbours)).toBeUndefined();
		expect(deckKeyTarget(press('ArrowRight', { metaKey: true }), neighbours)).toBeUndefined();
		expect(deckKeyTarget(press('ArrowRight', { ctrlKey: true }), neighbours)).toBeUndefined();
	});

	it('keeps out of the way while somebody types', () => {
		const field = document.createElement('textarea');
		expect(deckKeyTarget(press('ArrowLeft', { target: field }), neighbours)).toBeUndefined();
		const button = document.createElement('button');
		expect(deckKeyTarget(press('ArrowLeft', { target: button }), neighbours)).toBe('before');
	});
});

describe('deckKeyTarget, next unreviewed', () => {
	it('jumps to the next unreviewed card on n', () => {
		expect(deckKeyTarget(press('n'), { unreviewedId: 'open' })).toBe('open');
		expect(deckKeyTarget(press('n'), neighbours)).toBeUndefined();
	});
});

describe('isTyping', () => {
	it('knows the fields people type in', () => {
		for (const tag of ['input', 'textarea', 'select']) {
			expect(isTyping(document.createElement(tag))).toBe(true);
		}
		expect(isTyping(document.createElement('div'))).toBe(false);
		expect(isTyping(null)).toBe(false);
	});
});

describe('ratingForKey', () => {
	it('rates with the keys 1 to 5 only', () => {
		expect(ratingForKey(press('1'))).toBe(1);
		expect(ratingForKey(press('5'))).toBe(5);
		expect(ratingForKey(press('0'))).toBeUndefined();
		expect(ratingForKey(press('6'))).toBeUndefined();
		expect(ratingForKey(press('n'))).toBeUndefined();
	});

	it('leaves shortcuts and typing alone', () => {
		expect(ratingForKey(press('3', { ctrlKey: true }))).toBeUndefined();
		expect(
			ratingForKey(press('3', { target: document.createElement('textarea') }))
		).toBeUndefined();
	});
});

describe('clearsRatingKey', () => {
	it('is Ctrl + D or Cmd + D', () => {
		expect(clearsRatingKey(press('d', { ctrlKey: true }))).toBe(true);
		expect(clearsRatingKey(press('D', { metaKey: true }))).toBe(true);
		expect(clearsRatingKey(press('d'))).toBe(false);
		expect(clearsRatingKey(press('x', { ctrlKey: true }))).toBe(false);
		expect(clearsRatingKey(press('d', { ctrlKey: true, altKey: true }))).toBe(false);
	});

	it('leaves typing alone', () => {
		const field = document.createElement('textarea');
		expect(clearsRatingKey(press('d', { ctrlKey: true, target: field }))).toBe(false);
	});
});
