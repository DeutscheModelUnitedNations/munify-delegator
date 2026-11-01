import { describe, expect, test } from 'vitest';

import {
	nationInitial,
	nonStateActorGroups,
	ownNametagTable,
	ownSeat,
	singleRoleGroups,
	splitIntoNametagBins,
	type NametagBin
} from './bins';

const counts = (entries: Record<string, number>) =>
	Object.entries(entries).map(([letter, count]) => ({ letter, count }));

describe('nationInitial', () => {
	test("files a nation by its name in the reader's language", () => {
		expect(nationInitial({ alpha3Code: 'DEU', language: 'eng' })).toBe('G');
		expect(nationInitial({ alpha3Code: 'DEU', language: 'deu' })).toBe('D');
		expect(nationInitial({ alpha3Code: 'deu', language: 'eng' })).toBe('G');
	});

	test('drops diacritics, so Ägypten is an A', () => {
		expect(nationInitial({ alpha3Code: 'EGY', language: 'deu' })).toBe('A');
		expect(nationInitial({ alpha3Code: 'EGY', language: 'eng' })).toBe('E');
		expect(nationInitial({ alpha3Code: 'ALA', language: 'eng' })).toBe('A');
	});

	test('any language the nation list translates into works, others read English', () => {
		expect(nationInitial({ alpha3Code: 'DEU', language: 'fra' })).toBe('A');
		expect(nationInitial({ alpha3Code: 'DEU', language: 'xyz' })).toBe('G');
	});

	test('falls back to the code for an unknown nation', () => {
		expect(nationInitial({ alpha3Code: 'QQQ', language: 'eng' })).toBe('Q');
	});
});

describe('splitIntoNametagBins', () => {
	test('never divides a letter and keeps the letters in order', () => {
		const bins = splitIntoNametagBins({
			letterCounts: counts({ A: 10, B: 10, C: 10, D: 10, E: 10, F: 10 }),
			others: 0,
			binCount: 3
		});
		expect(bins.map((bin) => bin.letters)).toEqual([
			['A', 'B'],
			['C', 'D'],
			['E', 'F']
		]);
	});

	test('a big letter stays whole in one bin', () => {
		const bins = splitIntoNametagBins({
			letterCounts: counts({ A: 5, G: 40, M: 5, S: 5 }),
			others: 0,
			binCount: 3
		});
		expect(bins.filter((bin) => bin.letters.includes('G'))).toHaveLength(1);
		expect(bins.flatMap((bin) => bin.letters)).toEqual(['A', 'G', 'M', 'S']);
	});

	test('everyone without a nation gets a table of their own after the letter tables', () => {
		const bins = splitIntoNametagBins({
			letterCounts: counts({ A: 10, B: 10, C: 10, D: 10, E: 10, F: 10 }),
			others: 20,
			binCount: 3
		});
		expect(bins).toHaveLength(4);
		expect(bins.slice(0, 3).every((bin) => bin.otherParticipants === 0)).toBe(true);
		expect(bins[3]).toMatchObject({
			letters: [],
			fromLetter: null,
			otherParticipants: 20,
			nationParticipants: 0
		});
		expect(bins.slice(0, 3).map((bin) => bin.nationParticipants)).toEqual([20, 20, 20]);
	});

	test('the ranges cover the whole alphabet without gaps', () => {
		const bins = splitIntoNametagBins({
			letterCounts: counts({ B: 10, G: 10, M: 10, T: 10 }),
			others: 0,
			binCount: 2
		});
		expect(bins.map((bin) => [bin.fromLetter, bin.toLetter])).toEqual([
			['A', 'L'],
			['M', 'Z']
		]);
	});

	test('more bins than letters leaves the surplus bins empty', () => {
		const bins = splitIntoNametagBins({
			letterCounts: counts({ A: 3, B: 3 }),
			others: 0,
			binCount: 4
		});
		expect(bins).toHaveLength(4);
		expect(bins.filter((bin) => bin.letters.length > 0)).toHaveLength(2);
		expect(bins.flatMap((bin) => bin.letters).sort()).toEqual(['A', 'B']);
	});

	test('a single bin takes everyone', () => {
		const bins = splitIntoNametagBins({
			letterCounts: counts({ A: 3, Z: 4 }),
			others: 2,
			binCount: 1
		});
		expect(bins[0]).toMatchObject({ fromLetter: 'A', toLetter: 'Z', nationParticipants: 7 });
		expect(bins[1]).toMatchObject({ otherParticipants: 2 });
	});

	test('nobody seated yields empty bins', () => {
		const bins = splitIntoNametagBins({ letterCounts: [], others: 0, binCount: 3 });
		expect(bins).toHaveLength(3);
		expect(bins.every((bin) => bin.letters.length === 0 && bin.fromLetter === null)).toBe(true);
	});
});

const role = (name: string | null, fontAwesomeIcon: string | null = null) => ({
	name,
	fontAwesomeIcon
});

describe('nonStateActorGroups', () => {
	test('makes each non-state actor a group of its members, named after the role', () => {
		expect(
			nonStateActorGroups([
				{ memberCount: 3, assignedRole: role('Greenpeace', 'tree') },
				{ memberCount: 2, assignedRole: null }
			])
		).toEqual([
			{
				nationAlpha3Code: null,
				nationAlpha2Code: null,
				sortName: 'Greenpeace',
				roleName: 'Greenpeace',
				fontAwesomeIcon: 'tree',
				participants: 3
			},
			{
				nationAlpha3Code: null,
				nationAlpha2Code: null,
				sortName: '',
				roleName: null,
				fontAwesomeIcon: null,
				participants: 2
			}
		]);
	});
});

describe('singleRoleGroups', () => {
	test('counts the holders of each role, keeping the icon of the first', () => {
		const groups = singleRoleGroups({
			singles: [
				{ assignedRole: role('Press', 'newspaper') },
				{ assignedRole: role('Chair', 'gavel') },
				{ assignedRole: role('Press', 'camera') }
			],
			supervisors: 0,
			language: 'eng'
		});
		expect(groups.map((g) => [g.roleName, g.fontAwesomeIcon, g.participants])).toEqual([
			['Press', 'newspaper', 2],
			['Chair', 'gavel', 1]
		]);
	});

	test("adds the supervisors as one group, named in the conference's language", () => {
		expect(singleRoleGroups({ singles: [], supervisors: 4, language: 'deu' })).toMatchObject([
			{ roleName: 'Betreuende', fontAwesomeIcon: 'chalkboard-user', participants: 4 }
		]);
		expect(singleRoleGroups({ singles: [], supervisors: 1, language: 'eng' })).toMatchObject([
			{ roleName: 'Supervisors' }
		]);
	});

	test('puts singles without a role name into one unnamed group', () => {
		expect(
			singleRoleGroups({
				singles: [{ assignedRole: null }, { assignedRole: role(null) }],
				supervisors: 0,
				language: 'eng'
			})
		).toMatchObject([{ roleName: null, sortName: '', participants: 2 }]);
	});
});

const delegate = (assignedRoleId: string | null, nationAlpha3Code: string | null = null) => ({
	delegation: {
		assignedRoleId,
		assignedRole: assignedRoleId ? { nationAlpha3Code } : null
	}
});

describe('ownSeat', () => {
	test('a delegate of a seated delegation sits for its nation', () => {
		expect(
			ownSeat({ member: delegate('r1', 'DEU'), single: undefined, supervisor: false })
		).toEqual({ nation: 'DEU' });
	});

	test('a seated non-state actor, single participant or supervisor sits without a nation', () => {
		expect(ownSeat({ member: delegate('r2'), single: undefined, supervisor: false })).toEqual({
			nation: null
		});
		expect(
			ownSeat({ member: undefined, single: { assignedRoleId: 'r3' }, supervisor: false })
		).toEqual({ nation: null });
		expect(ownSeat({ member: undefined, single: undefined, supervisor: true })).toEqual({
			nation: null
		});
	});

	test('nobody without an assigned role or a supervision has a seat', () => {
		expect(
			ownSeat({ member: delegate(null), single: { assignedRoleId: null }, supervisor: false })
		).toBeNull();
		expect(ownSeat({ member: undefined, single: undefined, supervisor: false })).toBeNull();
	});
});

describe('ownNametagTable', () => {
	const bin = (letters: string[], otherParticipants = 0): NametagBin => ({
		letters,
		fromLetter: letters.at(0) ?? null,
		toLetter: letters.at(-1) ?? null,
		nationParticipants: letters.length,
		otherParticipants
	});
	const bins = [bin(['A', 'D']), bin(['G', 'S']), bin([], 5)];

	test("sends a nation to the table of its initial in the conference's language", () => {
		expect(ownNametagTable({ bins, seat: { nation: 'DEU' }, language: 'deu' })).toEqual({
			index: 0,
			fromLetter: 'A',
			toLetter: 'D',
			others: false
		});
		expect(ownNametagTable({ bins, seat: { nation: 'DEU' }, language: 'eng' })).toMatchObject({
			index: 1
		});
	});

	test('sends everyone without a nation to the table of the others', () => {
		expect(ownNametagTable({ bins, seat: { nation: null }, language: 'eng' })).toEqual({
			index: 2,
			fromLetter: null,
			toLetter: null,
			others: true
		});
	});

	test('finds no table when none serves the seat', () => {
		expect(ownNametagTable({ bins, seat: { nation: 'NOR' }, language: 'eng' })).toBeNull();
		expect(
			ownNametagTable({ bins: bins.slice(0, 2), seat: { nation: null }, language: 'eng' })
		).toBeNull();
	});
});
