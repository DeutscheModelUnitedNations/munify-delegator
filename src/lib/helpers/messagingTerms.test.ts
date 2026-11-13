import { describe, expect, test } from 'vitest';
import {
	acceptedMessagingTerms,
	MESSAGING_TERMS_VERSION,
	messagingTermsSections,
	messagingTermsVersionSchema
} from './messagingTerms';

describe('acceptedMessagingTerms', () => {
	test('only the terms as they stand count', () => {
		expect(acceptedMessagingTerms(MESSAGING_TERMS_VERSION)).toBe(true);
		expect(acceptedMessagingTerms(MESSAGING_TERMS_VERSION - 1)).toBe(false);
		expect(acceptedMessagingTerms(null)).toBe(false);
		expect(acceptedMessagingTerms(undefined)).toBe(false);
	});
});

describe('messagingTermsVersionSchema', () => {
	test('an acceptance names the version shown', () => {
		expect(messagingTermsVersionSchema.safeParse(MESSAGING_TERMS_VERSION).success).toBe(true);
		expect(messagingTermsVersionSchema.safeParse(MESSAGING_TERMS_VERSION + 1).success).toBe(false);
		expect(messagingTermsVersionSchema.safeParse(0).success).toBe(false);
	});
});

describe('messagingTermsSections', () => {
	test('every section has a title, an icon and text', () => {
		const sections = messagingTermsSections();
		expect(sections.length).toBeGreaterThan(0);
		for (const section of sections) {
			expect(section.title).not.toBe('');
			expect(section.icon).toMatch(/^[a-z-]+$/);
			expect(section.paragraphs.length).toBeGreaterThan(0);
			expect(section.paragraphs.every((paragraph) => paragraph.trim() !== '')).toBe(true);
		}
		const titles = sections.map((section) => section.title);
		expect(new Set(titles).size).toBe(titles.length);
	});

	test('they say who reads along, and that the trusted persons are the exception', () => {
		const text = messagingTermsSections()
			.flatMap((section) => section.paragraphs)
			.join(' ');
		expect(text).toContain('Teilnehmendenbetreuung');
		expect(text).toContain('Vertrauenspersonen');
		expect(text).toContain('melden');
	});
});
