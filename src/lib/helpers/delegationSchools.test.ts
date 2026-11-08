import { describe, expect, test } from 'vitest';
import { delegationSchoolsLabel, distinctSchoolNames, distinctSchools } from './delegationSchools';

const kiel = { name: 'Gymnasium Kiel' };
const luebeck = { name: 'Schule Lübeck' };

describe('distinctSchoolNames', () => {
	test('names each school once, the most common first, then by name', () => {
		expect(distinctSchoolNames([luebeck, kiel, null, kiel, undefined])).toEqual([
			'Gymnasium Kiel',
			'Schule Lübeck'
		]);
		expect(distinctSchoolNames([luebeck, kiel])).toEqual(['Gymnasium Kiel', 'Schule Lübeck']);
	});

	test('is empty when nobody has a school', () => {
		expect(distinctSchoolNames([null, undefined])).toEqual([]);
	});
});

describe('distinctSchools', () => {
	test('keeps each school once by id, in the same order as the names', () => {
		const a = { id: 'a', name: 'Schule Lübeck' };
		const b = { id: 'b', name: 'Gymnasium Kiel' };
		const namesake = { id: 'c', name: 'Gymnasium Kiel' };
		expect(distinctSchools([a, b, null, a, namesake])).toEqual([a, b, namesake]);
	});
});

describe('delegationSchoolsLabel', () => {
	test("joins the members' schools", () => {
		expect(delegationSchoolsLabel([{ school: kiel }, { school: luebeck }, { school: kiel }])).toBe(
			'Gymnasium Kiel, Schule Lübeck'
		);
	});

	test('is null without any school', () => {
		expect(delegationSchoolsLabel([{ school: null }, {}])).toBeNull();
		expect(delegationSchoolsLabel([])).toBeNull();
	});
});
