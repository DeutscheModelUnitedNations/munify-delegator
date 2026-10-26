import { describe, expect, test } from 'vitest';
import {
	defaultEmailText,
	emailFooterParagraphs,
	fillEmailText,
	placeholdersOf,
	resolveEmailText
} from './emailTemplates';
import { EMAIL_GROUPS } from './emailKinds';

describe('fillEmailText', () => {
	test('fills the placeholders and keeps unknown ones as written', () => {
		const filled = fillEmailText(
			{ subject: 'Welcome to {conference}', heading: 'Hi {name}', body: 'You are {seat}. {typo}' },
			{ conference: 'MUN-SH', name: 'Ada', seat: 'France' }
		);
		expect(filled).toEqual({
			subject: 'Welcome to MUN-SH',
			heading: 'Hi Ada',
			paragraphs: ['You are France. {typo}'],
			items: [],
			closing: []
		});
	});

	test('places the list where the body says, and after it otherwise', () => {
		expect(
			fillEmailText({ subject: 's', heading: 'h', body: 'a\n\n{list}\n\nb' }, {}, ['x'])
		).toMatchObject({
			paragraphs: ['a'],
			items: ['x'],
			closing: ['b']
		});
		expect(fillEmailText({ subject: 's', heading: 'h', body: 'a\n\nb' }, {}, ['x'])).toMatchObject({
			paragraphs: ['a', 'b'],
			items: ['x'],
			closing: []
		});
	});

	test('drops a paragraph that comes out empty', () => {
		const filled = fillEmailText(
			{ subject: 's', heading: 'h', body: 'a\n\n{delegationHint}' },
			{ delegationHint: '' }
		);
		expect(filled.paragraphs).toEqual(['a']);
	});
});

describe('the default texts', () => {
	test.each(['de', 'en'] as const)('use only the placeholders their kind offers (%s)', (locale) => {
		for (const kind of EMAIL_GROUPS.flatMap((group) => group.kinds)) {
			const text = defaultEmailText(kind, locale);
			const used = [...`${text.subject} ${text.heading} ${text.body}`.matchAll(/\{(\w+)\}/g)].map(
				(match) => match[1]
			);
			for (const placeholder of used) {
				expect(placeholdersOf(kind)).toContain(placeholder);
			}
		}
	});

	test('offer no name to an invitation, which goes to someone without an account', () => {
		expect(placeholdersOf('TEAM_INVITATION')).not.toContain('name');
		expect(placeholdersOf('TEAM_INVITATION')).toEqual(
			expect.arrayContaining(['conference', 'role', 'inviter', 'date'])
		);
		expect(placeholdersOf('TEAM_WELCOME')).toContain('name');
	});

	test('a conference text replaces only the fields it has', () => {
		const standard = defaultEmailText('POSTAL_RECEIVED', 'de');
		expect(resolveEmailText('POSTAL_RECEIVED', 'de', { subject: 'Eigen', body: '  ' })).toEqual({
			...standard,
			subject: 'Eigen'
		});
	});
});

describe('emailFooterParagraphs', () => {
	test('splits at blank lines, keeps line breaks and names the conference', () => {
		expect(
			emailFooterParagraphs('Ihr Team von {conference}\nKiel\n\n\n  info@example.org  ', 'MUN-SH')
		).toEqual(['Ihr Team von MUN-SH\nKiel', 'info@example.org']);
	});

	test('is nothing without a footer', () => {
		expect(emailFooterParagraphs(undefined, 'MUN-SH')).toEqual([]);
		expect(emailFooterParagraphs('  \n\n ', 'MUN-SH')).toEqual([]);
	});
});
