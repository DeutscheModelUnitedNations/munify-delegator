import { describe, expect, test } from 'vitest';
import { delegationSchoolsLabel, distinctSchoolNames } from './delegationSchools';

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
