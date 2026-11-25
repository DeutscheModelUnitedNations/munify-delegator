import { expect, test } from 'vitest';
import { matrixRowHeading } from './matrixRowHeading';

const texts = {
	missing: 'fehlt',
	committeePage: 'Gremium',
	agendaItem: (number: number) => `Thema ${number}`
};

test('names rows by their own title, their page or what they stand for', () => {
	const page = { id: 'p', title: 'Positionspapier', state: 'PUBLISHED' as const };
	expect(matrixRowHeading({ row: { kind: 'shared', key: 'a', label: null, page }, texts })).toBe(
		'Positionspapier'
	);
	expect(
		matrixRowHeading({ row: { kind: 'shared', key: 'a', label: 'Schritt 5', page }, texts })
	).toBe('Schritt 5');
	expect(
		matrixRowHeading({ row: { kind: 'shared', key: 'a', label: null, page: null }, texts })
	).toBe('fehlt');
	expect(
		matrixRowHeading({ row: { kind: 'agendaItem', key: 'b', number: 2, cells: [] }, texts })
	).toBe('Thema 2');
	expect(
		matrixRowHeading({ row: { kind: 'committeePage', key: 'c', label: null, cells: [] }, texts })
	).toBe('Gremium');
});
