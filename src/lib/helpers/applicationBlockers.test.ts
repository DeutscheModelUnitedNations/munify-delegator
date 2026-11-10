import { describe, expect, test } from 'vitest';
import {
	applicationBlockers,
	applicationBlockerTexts,
	profileFieldLabel
} from './applicationBlockers';
import { PROFILE_FIELDS } from '#lib/schemata/userForm';

/** Participants from 15 to 21, supervisors from 25, so every participant issue can occur. */
const conference = {
	startConference: new Date('2026-06-01T00:00:00Z'),
	participantMinAge: 15,
	participantMaxAge: 21,
	supervisorMinAge: 25
};

/** Seventeen on the first conference day, with a profile the account form accepts. */
const ada = {
	id: 'ada',
	givenName: 'Ada',
	familyName: 'Lovelace',
	birthday: new Date('2009-03-01T00:00:00Z'),
	phone: '+4915112345678',
	street: 'Hauptstraße 1',
	apartment: null,
	zip: '10115',
	city: 'Berlin',
	region: null,
	country: 'DEU',
	gender: 'FEMALE',
	pronouns: null,
	foodPreference: 'VEGAN',
	emergencyContacts: 'Mutter: +4915112345679',
	wantsToReceiveGeneralInformation: false,
	wantsJoinTeamInformation: false
};

const bornIn = (year: number) => new Date(`${year}-03-01T00:00:00Z`);

describe('applicationBlockers', () => {
	test('finds nothing about a complete person of the right age', () => {
		expect(applicationBlockers({ role: 'participant', conference, people: [ada] })).toEqual([]);
	});

	test.each([
		[2012, 'tooYoung'],
		[2003, 'tooOld'],
		[1990, 'shouldBeSupervisor']
	] as const)('judges someone born in %i as %s', (year, issue) => {
		expect(
			applicationBlockers({
				role: 'participant',
				conference,
				people: [{ ...ada, birthday: bornIn(year) }]
			})
		).toEqual([{ userId: 'ada', ageIssue: issue, invalidFields: [] }]);
	});

	test('takes the age on the first conference day, both limits included', () => {
		const people = [
			{ ...ada, id: 'fifteen', birthday: new Date('2011-06-01T00:00:00Z') },
			{ ...ada, id: 'fourteen', birthday: new Date('2011-06-02T00:00:00Z') },
			{ ...ada, id: 'twentyOne', birthday: new Date('2004-06-02T00:00:00Z') }
		];
		expect(applicationBlockers({ role: 'participant', conference, people })).toEqual([
			{ userId: 'fourteen', ageIssue: 'tooYoung', invalidFields: [] }
		]);
	});

	test('names the fields an incomplete profile lacks, in the form order', () => {
		const incomplete = { ...ada, phone: null, emergencyContacts: '', street: null, zip: null };
		expect(applicationBlockers({ role: 'participant', conference, people: [incomplete] })).toEqual([
			{
				userId: 'ada',
				ageIssue: null,
				invalidFields: ['phone', 'street', 'zip', 'emergencyContacts']
			}
		]);
	});

	test('counts a missing birthday as a profile finding, not an age one', () => {
		expect(
			applicationBlockers({ role: 'participant', conference, people: [{ ...ada, birthday: null }] })
		).toEqual([{ userId: 'ada', ageIssue: null, invalidFields: ['birthday'] }]);
	});

	test('judges everyone of the application and lists only those with a finding', () => {
		const people = [
			ada,
			{ ...ada, id: 'young', birthday: bornIn(2012), phone: 'nope' },
			{ ...ada, id: 'old', birthday: bornIn(1990) }
		];
		expect(applicationBlockers({ role: 'participant', conference, people })).toEqual([
			{ userId: 'young', ageIssue: 'tooYoung', invalidFields: ['phone'] },
			{ userId: 'old', ageIssue: 'shouldBeSupervisor', invalidFields: [] }
		]);
	});

	test('ignores limits a conference switched off', () => {
		const open = { ...conference, participantMinAge: null, participantMaxAge: null };
		const people = [
			{ ...ada, birthday: bornIn(2012) },
			{ ...ada, id: 'old', birthday: bornIn(1990) }
		];
		expect(applicationBlockers({ role: 'participant', conference: open, people })).toEqual([]);
	});
});

describe('applicationBlockers for supervisors', () => {
	const supervisor = { ...ada, id: 'sup', birthday: bornIn(1990) };

	test('finds nothing about a complete supervisor old enough', () => {
		expect(applicationBlockers({ role: 'supervisor', conference, people: [supervisor] })).toEqual(
			[]
		);
	});

	test('holds back a supervisor younger than supervisorMinAge', () => {
		expect(
			applicationBlockers({
				role: 'supervisor',
				conference,
				people: [{ ...supervisor, birthday: bornIn(2003) }]
			})
		).toEqual([{ userId: 'sup', ageIssue: 'shouldNotBeSupervisor', invalidFields: [] }]);
	});

	test('does not hold the participants range against a supervisor', () => {
		// 36 is past `participantMaxAge`, yet fine for a supervisor; 17 is too young either way
		expect(applicationBlockers({ role: 'supervisor', conference, people: [supervisor] })).toEqual(
			[]
		);
		expect(applicationBlockers({ role: 'supervisor', conference, people: [ada] })).toEqual([
			{ userId: 'ada', ageIssue: 'shouldNotBeSupervisor', invalidFields: [] }
		]);
	});

	test('holds back an incomplete profile as for anyone', () => {
		const incomplete = { ...supervisor, phone: null };
		expect(applicationBlockers({ role: 'supervisor', conference, people: [incomplete] })).toEqual([
			{ userId: 'sup', ageIssue: null, invalidFields: ['phone'] }
		]);
	});
});

describe('applicationBlockerTexts', () => {
	test('says the profile fields first, then the age', () => {
		const texts = applicationBlockerTexts({
			ageIssue: 'tooYoung',
			invalidFields: ['phone', 'street']
		});
		expect(texts).toHaveLength(2);
		expect(texts[0]).toContain(profileFieldLabel('phone'));
		expect(texts[0]).toContain(profileFieldLabel('street'));
	});

	test('says nothing for nothing', () => {
		expect(applicationBlockerTexts({ ageIssue: null, invalidFields: [] })).toEqual([]);
	});

	test('has a label for every profile field', () => {
		for (const field of PROFILE_FIELDS) expect(profileFieldLabel(field)).not.toBe('');
	});
});
