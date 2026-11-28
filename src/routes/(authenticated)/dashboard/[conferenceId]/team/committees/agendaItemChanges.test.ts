import { expect, test } from 'vitest';
import { agendaItemChanges } from './agendaItemChanges';

const stored = { title: 'Wasser', teaserText: null, discussionPoints: ['Eins', 'Zwei'] };

test('sends nothing for an unchanged agenda item, blank points left aside', () => {
	expect(
		agendaItemChanges({
			stored,
			draft: { title: 'Wasser', teaserText: '', discussionPoints: ['Eins', ' ', 'Zwei'] }
		})
	).toEqual({ title: undefined, teaserText: undefined, discussionPoints: undefined });
});

test('sends only the fields that changed', () => {
	expect(
		agendaItemChanges({
			stored,
			draft: { title: 'Wasser', teaserText: 'Neu', discussionPoints: ['Zwei', 'Eins'] }
		})
	).toEqual({ title: undefined, teaserText: 'Neu', discussionPoints: ['Zwei', 'Eins'] });
});

test('clearing every point sends an empty list', () => {
	expect(
		agendaItemChanges({
			stored,
			draft: { title: 'Wasser', teaserText: '', discussionPoints: [''] }
		}).discussionPoints
	).toEqual([]);
});
