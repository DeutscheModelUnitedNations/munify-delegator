import { expect, test } from 'vitest';
import type { WorkspacePage } from '#lib/guide/workspace';
import { slotView } from './slotView';

const page: WorkspacePage = { id: 'p', title: 'Positionspapier', kind: 'GENERAL', state: 'DRAFT' };
const pageOf = (pageId: string) => (pageId === 'p' ? page : undefined);
const texts = { missing: 'fehlt', committeePage: 'Gremium', agendaItemPages: 'Themen' };

test('a page slot shows its page, under its own title if it has one', () => {
	expect(slotView({ slot: { type: 'page', pageId: 'p' }, pageOf, texts })).toEqual({
		title: 'Positionspapier',
		page
	});
	expect(
		slotView({ slot: { type: 'page', pageId: 'p', label: 'Schritt 5' }, pageOf, texts }).title
	).toBe('Schritt 5');
	expect(slotView({ slot: { type: 'page', pageId: 'gone' }, pageOf, texts })).toEqual({
		title: 'fehlt',
		page: undefined
	});
});

test('placeholders show what they stand for', () => {
	expect(slotView({ slot: { type: 'committeePage' }, pageOf, texts }).title).toBe('Gremium');
	expect(
		slotView({ slot: { type: 'committeePage', label: 'Dein Gremium' }, pageOf, texts }).title
	).toBe('Dein Gremium');
	expect(slotView({ slot: { type: 'agendaItemPages' }, pageOf, texts }).title).toBe('Themen');
});
