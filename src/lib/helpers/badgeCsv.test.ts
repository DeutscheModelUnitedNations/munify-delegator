import { describe, expect, test } from 'vitest';
import { badgeHeader, badgeRow, personBadge, placardBadges } from './badgeCsv';

/** A row is valid for the generator: a name or a committee, and a flag or an image, not both. */
function generatorAccepts(row: string[]) {
	const [name, committee, , alpha2, image] = row;
	return (!!name || !!committee) && !!alpha2 !== !!image;
}

describe('badgeRow', () => {
	test('matches the header and fills missing values', () => {
		const full = badgeRow({
			name: 'Ada Lovelace',
			committee: 'GA',
			countryName: 'Germany',
			countryAlpha2Code: 'de',
			alternativeImage: 'img',
			pronouns: 'she/her',
			id: 'u',
			mediaConsentStatus: 'ALLOWED_ALL'
		});
		expect(full).toHaveLength(badgeHeader.length);
		expect(full).toEqual([
			'Ada Lovelace',
			'GA',
			'Germany',
			'de',
			'img',
			'she/her',
			'u',
			'ALLOWED_ALL'
		]);
		expect(badgeRow({ name: 'Ada', countryName: 'Team' })).toEqual([
			'Ada',
			'',
			'Team',
			'',
			'',
			'',
			'',
			'NOT_SET'
		]);
	});
});

describe('personBadge', () => {
	const person = {
		name: 'Ada Lovelace',
		pronouns: 'sie/ihr',
		id: 'u1',
		mediaConsentStatus: 'NOT_SET'
	};

	test('shows a nation by its flag, a label under the UN flag, a supervisor by an image', () => {
		const nation = badgeRow(
			personBadge(person, {
				kind: 'nation',
				alpha2Code: 'de',
				countryName: 'Deutschland',
				committee: 'GV'
			})
		);
		const label = badgeRow(personBadge(person, { kind: 'label', label: 'Presse' }));
		const image = badgeRow(
			personBadge(person, { kind: 'image', label: 'Betreuung', image: 'supervisor' })
		);
		expect(nation).toEqual([
			'Ada Lovelace',
			'GV',
			'Deutschland',
			'de',
			'',
			'sie/ihr',
			'u1',
			'NOT_SET'
		]);
		expect(label[3]).toBe('un');
		expect(image[4]).toBe('supervisor');
		expect([nation, label, image].every(generatorAccepts)).toBe(true);
	});
});

describe('placardBadges', () => {
	const names: Record<string, string> = { deu: 'Deutschland', fra: 'Frankreich' };
	const countryName = (alpha3: string) => names[alpha3] ?? alpha3;

	test('puts one placard per seat at each committee table, without person names', () => {
		const placards = placardBadges(
			[
				{
					abbreviation: 'SR',
					nations: [{ alpha2Code: 'fr', alpha3Code: 'fra' }],
					nonStateActors: ['Amnesty International', 'Amnesty International']
				},
				{
					abbreviation: 'GV',
					nations: [
						{ alpha2Code: 'fr', alpha3Code: 'fra' },
						{ alpha2Code: 'de', alpha3Code: 'deu' }
					],
					nonStateActors: []
				}
			],
			['Greenpeace'],
			countryName
		);
		expect(placards.map((p) => [p.committee ?? '', p.countryName])).toEqual([
			['GV', 'Deutschland'],
			['GV', 'Frankreich'],
			['SR', 'Amnesty International'],
			['SR', 'Frankreich'],
			['', 'Greenpeace']
		]);
		expect(placards.filter((p) => p.committee).every((p) => p.name === '')).toBe(true);
		expect(placards.map(badgeRow).every(generatorAccepts)).toBe(true);
	});
});
