import { beforeEach, describe, expect, test } from 'vitest';
import { overwriteGetLocale } from '#lib/paraglide/runtime';
import {
	audienceKindLabel,
	audienceLabel,
	isAnnouncementState,
	roleLabel,
	type AudienceLookups
} from './announcementLabels';

const lookups: AudienceLookups = {
	committees: new Map([['c1', 'GV']]),
	roles: new Map([['r1', 'Frankreich']]),
	surveyOptions: new Map([['o1', 'Workshop A']])
};

beforeEach(() => overwriteGetLocale(() => 'de'));

describe('audienceLabel', () => {
	test('a block that names nothing is its kind', () => {
		expect(audienceLabel({ audience: { kind: 'SUPERVISORS' }, lookups })).toBe(
			audienceKindLabel('SUPERVISORS')
		);
	});

	test.each([
		[{ kind: 'COMMITTEE', committeeId: 'c1' } as const, 'GV'],
		[{ kind: 'ROLE', roleId: 'r1' } as const, 'Frankreich'],
		[{ kind: 'SURVEY_OPTION', surveyOptionId: 'o1' } as const, 'Workshop A']
	])('names what the block is about: %o', (audience, name) => {
		expect(audienceLabel({ audience, lookups })).toBe(
			`${audienceKindLabel(audience.kind)}: ${name}`
		);
	});

	test.each([
		{ kind: 'COMMITTEE', committeeId: 'gone' } as const,
		{ kind: 'ROLE' } as const,
		{ kind: 'SURVEY_OPTION', surveyOptionId: null } as const
	])('says so when what it named is gone: %o', (audience) => {
		const label = audienceLabel({ audience, lookups });
		expect(label.startsWith(`${audienceKindLabel(audience.kind)}: `)).toBe(true);
		expect(label).not.toContain('undefined');
	});

	test('the team is the whole team, or one of its roles', () => {
		const team = audienceKindLabel('TEAM');
		expect(audienceLabel({ audience: { kind: 'TEAM' }, lookups })).toBe(team);
		const care = audienceLabel({
			audience: { kind: 'TEAM', teamRole: 'PARTICIPANT_CARE' },
			lookups
		});
		expect(care).toBe(`${team}: Teilnehmendenbetreuung`);
	});
});

describe('roleLabel', () => {
	test('a nation in the reader language, anything else by its own name', () => {
		expect(roleLabel({ nationAlpha3Code: 'FRA', name: null })).toBe('Frankreich');
		expect(roleLabel({ name: 'Presse' })).toBe('Presse');
		expect(roleLabel({})).toBe('');
	});
});

test('isAnnouncementState knows the states of the page only', () => {
	expect(isAnnouncementState('SCHEDULED')).toBe(true);
	expect(isAnnouncementState('GONE')).toBe(false);
});
