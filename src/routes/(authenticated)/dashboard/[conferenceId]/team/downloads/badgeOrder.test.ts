import { describe, expect, test } from 'vitest';
import { sortedBadges, tableBadges } from './badgeOrder';

const row = ({ id, label, familyName }: { id: string; label: string; familyName: string }) => ({
	badge: { id, name: id, countryName: label },
	label,
	familyName
});

const nation = (args: { id: string; alpha3Code: string; familyName: string }) => ({
	...row({ id: args.id, label: 'shown name', familyName: args.familyName }),
	alpha3Code: args.alpha3Code
});

describe('sortedBadges', () => {
	test('sorts by label, then family name', () => {
		const ids = sortedBadges([
			row({ id: 'b2', label: 'B', familyName: 'Zander' }),
			row({ id: 'a', label: 'A', familyName: 'Zander' }),
			row({ id: 'b1', label: 'B', familyName: 'Adler' })
		]).map((badge) => badge.id);
		expect(ids).toEqual(['a', 'b1', 'b2']);
	});
});

describe('tableBadges', () => {
	const nationNames = new Map([
		['DEU', 'Deutschland'],
		['EGY', 'Ägypten'],
		['CHN', 'China']
	]);

	test("keeps only the table's nations, sorted by the name they are filed under", () => {
		const ids = tableBadges({
			nations: [
				nation({ id: 'deu', alpha3Code: 'DEU', familyName: 'A' }),
				nation({ id: 'fra', alpha3Code: 'FRA', familyName: 'A' }),
				nation({ id: 'egy', alpha3Code: 'egy', familyName: 'A' }),
				nation({ id: 'chn', alpha3Code: 'CHN', familyName: 'A' })
			],
			nationNames,
			others: []
		}).map((badge) => badge.id);
		expect(ids).toEqual(['egy', 'chn', 'deu']);
	});

	test('puts everyone without a nation after the nations', () => {
		const ids = tableBadges({
			nations: [nation({ id: 'deu', alpha3Code: 'DEU', familyName: 'A' })],
			nationNames,
			others: [
				row({ id: 'press', label: 'Presse', familyName: 'B' }),
				row({ id: 'amnesty', label: 'Amnesty', familyName: 'C' })
			]
		}).map((badge) => badge.id);
		expect(ids).toEqual(['deu', 'amnesty', 'press']);
	});
});
