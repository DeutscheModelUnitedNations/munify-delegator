import { describe, expect, test } from 'vitest';
import { defaultEmailText } from '#lib/helpers/emailTemplates';
import { emailFooterParagraphs, fillEmailText, resolveEmailText } from './emailText';

describe('fillEmailText', () => {
	test('fills the placeholders and keeps unknown ones as written', () => {
		const filled = fillEmailText({
			text: {
				subject: 'Welcome to {conference}',
				heading: 'Hi {name}',
				body: 'You are {seat}. {typo}'
			},
			values: { conference: 'MUN-SH', name: 'Ada', seat: 'France' }
		});
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
			fillEmailText({
				text: { subject: 's', heading: 'h', body: 'a\n\n{list}\n\nb' },
				values: {},
				items: ['x']
			})
		).toMatchObject({
			paragraphs: ['a'],
			items: ['x'],
			closing: ['b']
		});
		expect(
			fillEmailText({
				text: { subject: 's', heading: 'h', body: 'a\n\nb' },
				values: {},
				items: ['x']
			})
		).toMatchObject({
			paragraphs: ['a', 'b'],
			items: ['x'],
			closing: []
		});
	});

	test('drops a paragraph that comes out empty', () => {
		const filled = fillEmailText({
			text: { subject: 's', heading: 'h', body: 'a\n\n{delegationHint}' },
			values: { delegationHint: '' }
		});
		expect(filled.paragraphs).toEqual(['a']);
	});
});

describe('resolveEmailText', () => {
	test('a conference text replaces only the fields it has', () => {
		const standard = defaultEmailText({ kind: 'POSTAL_RECEIVED', locale: 'de' });
		expect(
			resolveEmailText({
				kind: 'POSTAL_RECEIVED',
				locale: 'de',
				override: { subject: 'Eigen', body: '  ' }
			})
		).toEqual({
			...standard,
			subject: 'Eigen'
		});
	});
});

describe('emailFooterParagraphs', () => {
	test('splits at blank lines, keeps line breaks and names the conference', () => {
		expect(
			emailFooterParagraphs({
				footer: 'Ihr Team von {conference}\nKiel\n\n\n  info@example.org  ',
				conferenceTitle: 'MUN-SH'
			})
		).toEqual(['Ihr Team von MUN-SH\nKiel', 'info@example.org']);
	});

	test('is nothing without a footer', () => {
		expect(emailFooterParagraphs({ footer: undefined, conferenceTitle: 'MUN-SH' })).toEqual([]);
		expect(emailFooterParagraphs({ footer: '  \n\n ', conferenceTitle: 'MUN-SH' })).toEqual([]);
	});
});
