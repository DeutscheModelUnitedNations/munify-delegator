import { beforeAll, describe, expect, test } from 'vitest';
import { overwriteGetLocale } from '#lib/paraglide/runtime';
import { postalRegistrationTexts } from './postalRegistrationTexts';

const startConference = new Date('2026-12-05');
const PARENTS = /Eltern|Erziehungsberechtigt|parents|guardians/;
const UNDECIDED = /wenn du|ggf\.|if you|if applicable/;

function texts({
	birthday,
	start = startConference
}: {
	birthday: Date | null;
	start?: Date | null;
}) {
	const { documents, whereTo, warning } = postalRegistrationTexts({
		birthday,
		startConference: start,
		conferenceStart: '5.12.2026'
	});
	// nobody but a minor is warned
	return warning === undefined ? [documents, whereTo] : [documents, whereTo, warning];
}

describe.each(['de', 'en'] as const)('postalRegistrationTexts (%s)', (locale) => {
	beforeAll(() => overwriteGetLocale(() => locale));

	test('names no parents for somebody of age, their 18th birthday on the first day included', () => {
		for (const text of texts({ birthday: new Date('2008-12-05') }))
			expect(text).not.toMatch(PARENTS);
	});

	test('warns only who is a minor', () => {
		expect(texts({ birthday: new Date('2008-12-06') })).toHaveLength(3);
		expect(texts({ birthday: new Date('2008-12-05') })).toHaveLength(2);
		expect(texts({ birthday: null })).toHaveLength(2);
	});

	test('has the parents of a minor sign, without an if', () => {
		for (const text of texts({ birthday: new Date('2008-12-06') })) {
			expect(text).toMatch(PARENTS);
			expect(text).not.toMatch(UNDECIDED);
		}
	});

	test('leaves it open without a birthday or a start of the conference', () => {
		for (const text of [
			...texts({ birthday: null }),
			...texts({ birthday: new Date('1990-01-01'), start: null })
		]) {
			expect(text).toMatch(PARENTS);
			expect(text).toMatch(UNDECIDED);
		}
	});
});
