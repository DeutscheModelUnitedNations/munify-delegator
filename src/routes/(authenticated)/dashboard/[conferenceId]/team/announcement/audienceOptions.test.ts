import { describe, expect, test } from 'vitest';
import type { Audience } from '#lib/helpers/announcements';
import { audienceSections, canChoose, searchAudienceSections } from './audienceOptions';
import type { AudienceLookups } from './announcementLabels';

const lookups: AudienceLookups = {
	committees: new Map([
		['ga', 'GV · Generalversammlung'],
		['sc', 'SR · Sicherheitsrat']
	]),
	roles: new Map([['fra', 'Frankreich']]),
	surveyOptions: new Map()
};

const sections = (picked: Audience[] = []) => audienceSections({ lookups, picked });
const optionsOf = (picked: Audience[], key: string) =>
	sections(picked).find((section) => section.key === key)?.options ?? [];

describe('audienceSections', () => {
	test('offers every kind by section, leaving out empty ones', () => {
		expect(sections().map((section) => section.key)).toEqual([
			'groups',
			'committees',
			'roles',
			'team'
		]);
		expect(optionsOf([], 'committees').map((option) => option.label)).toEqual([
			'GV · Generalversammlung',
			'SR · Sicherheitsrat'
		]);
	});

	test('marks what is picked, and keeps it to be taken out again', () => {
		const groups = optionsOf([{ kind: 'SUPERVISORS' }], 'groups');
		const supervisors = groups.find((option) => option.audience.kind === 'SUPERVISORS');
		expect(supervisors?.picked).toBe(true);
		expect(supervisors && canChoose(supervisors)).toBe(true);
		expect(groups.filter((option) => option.picked)).toHaveLength(1);
	});

	test('says which picked block already holds an option', () => {
		const picked: Audience[] = [{ kind: 'EVERYONE' }];
		expect(optionsOf(picked, 'committees').every((option) => option.coveredBy)).toBe(true);
		expect(optionsOf(picked, 'committees').some(canChoose)).toBe(false);
		expect(optionsOf(picked, 'committees')[0].coveredBy).toBe('Alle Teilnehmenden');
		const groups = optionsOf(picked, 'groups');
		expect(groups.find((option) => option.audience.kind === 'SEATED')?.coveredBy).toBeTruthy();
		// a supervisor without a seated student is not in "everyone" then
		expect(groups.find((option) => option.audience.kind === 'SUPERVISORS')?.coveredBy).toBe(null);
	});
});

describe('searchAudienceSections', () => {
	const search = (text: string) =>
		searchAudienceSections({ sections: sections(), search: text }).flatMap((section) =>
			section.options.map((option) => option.label)
		);

	test('finds by every word, ignoring case and accents', () => {
		expect(search('sicherheit')).toEqual(['SR · Sicherheitsrat']);
		expect(search('FRANKREICH')).toEqual(['Frankreich']);
		expect(search('gv general')).toEqual(['GV · Generalversammlung']);
	});

	test('finds a whole section by its name', () => {
		expect(search('gremien')).toEqual(['GV · Generalversammlung', 'SR · Sicherheitsrat']);
	});

	test('an empty search keeps everything, a miss nothing', () => {
		expect(searchAudienceSections({ sections: sections(), search: '  ' })).toEqual(sections());
		expect(search('xyz')).toEqual([]);
	});
});
