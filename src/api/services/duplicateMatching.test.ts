import { describe, expect, it } from 'vitest';
import {
	DUPLICATE_THRESHOLD,
	compareKeys,
	findDuplicates,
	jaroWinkler,
	matchKeys,
	type MatchProfile
} from './duplicateMatching';

let counter = 0;
function profile(overrides: Partial<MatchProfile> = {}): MatchProfile {
	return {
		id: `user-${++counter}`,
		givenName: 'Lena',
		familyName: 'Schmidt',
		birthday: new Date('2007-03-14'),
		email: `someone${counter}@example.org`,
		phone: null,
		emergencyContacts: null,
		street: null,
		zip: null,
		country: 'DEU',
		...overrides
	};
}

function compare(a: MatchProfile, b: MatchProfile) {
	return compareKeys(matchKeys(a), matchKeys(b));
}

describe('jaroWinkler', () => {
	it('is 1 for equal strings and 0 for nothing in common', () => {
		expect(jaroWinkler('martha', 'martha')).toBe(1);
		expect(jaroWinkler('abc', 'xyz')).toBe(0);
	});

	it('scores the textbook examples', () => {
		expect(jaroWinkler('martha', 'marhta')).toBeCloseTo(0.961, 3);
		expect(jaroWinkler('dixon', 'dicksonx')).toBeCloseTo(0.813, 3);
	});
});

describe('compareKeys', () => {
	it('pairs the same person with a new account: same name and birthday, nothing else', () => {
		const old = profile({ email: 'lena.schmidt@example.org', zip: '10115', street: 'Hauptstr. 1' });
		const fresh = profile({ email: 'l.s.2009@other.example', zip: '80331', street: 'Ringweg 4' });
		expect(compare(old, fresh)).toEqual({ score: 0.7, reasons: ['birthday', 'name'] });
	});

	it('sees through spelling, umlauts, order and a dropped second given name', () => {
		const old = profile({ givenName: 'Jürgen Maximilian', familyName: 'Müller' });
		for (const fresh of [
			profile({ givenName: 'Juergen', familyName: 'Mueller' }),
			profile({ givenName: 'Müller', familyName: 'Jürgen' }),
			profile({ givenName: 'Jurgen', familyName: 'Muller' })
		]) {
			expect(compare(old, fresh)?.reasons).toContain('name');
		}
	});

	it('compares names across scripts', () => {
		const latin = profile({ givenName: 'Vladimir', familyName: 'Petrov' });
		const cyrillic = profile({ givenName: 'Владимир', familyName: 'Петров' });
		expect(compare(latin, cyrillic)?.reasons).toEqual(['birthday', 'name']);

		const chinese = profile({ givenName: '小龙', familyName: '李' });
		const pinyin = profile({ givenName: 'Xiaolong', familyName: 'Li' });
		expect(compare(chinese, pinyin)?.reasons).toEqual(['birthday', 'name']);
	});

	it('pairs a reused phone number or email with one more signal', () => {
		const old = profile({ phone: '+49 151 23456789', birthday: new Date('2006-01-01') });
		const fresh = profile({
			givenName: 'Anna',
			familyName: 'Weber',
			phone: '015123456789',
			birthday: new Date('2006-01-01')
		});
		expect(compare(old, fresh)).toEqual({ score: 0.85, reasons: ['birthday', 'phone'] });

		const mailOld = profile({ email: 'lena.schmidt+mun@gmail.com', birthday: null });
		const mailNew = profile({ email: 'lenaschmidt@gmail.com', birthday: null });
		expect(compare(mailOld, mailNew)?.reasons).toEqual(['email', 'name']);
	});

	it('leaves siblings alone: family name, address and parents in common', () => {
		const shared = {
			familyName: 'Schmidt',
			emergencyContacts: 'Mama: +49 170 1234567',
			zip: '10115',
			street: 'Hauptstraße 1'
		};
		const sister = profile({ ...shared, givenName: 'Lena', birthday: new Date('2007-03-14') });
		const brother = profile({ ...shared, givenName: 'Paul', birthday: new Date('2009-08-02') });
		expect(compare(sister, brother)).toBeUndefined();
	});

	it('flags twins, who look like one person to every signal it has', () => {
		const shared = { familyName: 'Schmidt', emergencyContacts: 'Papa +49 170 1234567' };
		const a = profile({ ...shared, givenName: 'Lena' });
		const b = profile({ ...shared, givenName: 'Lea' });
		expect(compare(a, b)?.score).toBeGreaterThanOrEqual(DUPLICATE_THRESHOLD);
	});

	it('does not take a shared family name and birthday for one person', () => {
		for (const [x, y] of [
			['Lilyan', 'Elaina'],
			['Max', 'Myra'],
			['Jamir', 'Jamison']
		]) {
			const a = profile({ givenName: x, familyName: 'Altenwerth' });
			const b = profile({ givenName: y, familyName: 'Altenwerth' });
			expect(compare(a, b), `${x} / ${y}`).toBeUndefined();
		}
	});

	it('forgives a typo in either name', () => {
		expect(compare(profile(), profile({ familyName: 'Schmitt' }))?.reasons).toEqual([
			'birthday',
			'name'
		]);
		expect(compare(profile(), profile({ givenName: 'Lenna' }))?.reasons).toEqual([
			'birthday',
			'name'
		]);
	});

	it('does not pair on a single signal', () => {
		expect(compare(profile(), profile({ givenName: 'Tom', familyName: 'Berg' }))).toBeUndefined();
		expect(
			compare(profile({ birthday: null }), profile({ birthday: new Date('2001-01-01') }))
		).toBeUndefined();
	});
});

describe('findDuplicates', () => {
	it('finds each pair once, never pairs an account with itself, and orders the ids', () => {
		const a = profile({ id: 'b-account' });
		const b = profile({ id: 'a-account' });
		const unrelated = profile({ givenName: 'Tom', familyName: 'Berg', birthday: null });
		const pairs = findDuplicates([a, b], [a, b, unrelated]);
		expect(pairs).toEqual([
			{ userId: 'a-account', candidateId: 'b-account', score: 0.7, reasons: ['birthday', 'name'] }
		]);
	});

	it('only compares accounts that share something', () => {
		const a = profile({ birthday: new Date('2000-01-01') });
		const b = profile({ birthday: new Date('2000-01-02') });
		expect(findDuplicates([a], [b])).toEqual([]);
	});
});
