import { describe, expect, test } from 'vitest';
import { locales } from '#lib/paraglide/runtime';
import {
	acceptanceHolds,
	contentHash,
	documentHash,
	latestTerms,
	parseTermsDocument,
	TERMS_LOCALES,
	termsInLocale
} from './messagingTermsDocument';
import { allTerms, currentTerms } from './terms';
import revisions from './terms/revisions.json';

const files = import.meta.glob<string>('./terms/*.yaml', {
	query: '?raw',
	import: 'default',
	eager: true
});

describe('the terms files', () => {
	test('hold every locale the app speaks', () => {
		expect([...TERMS_LOCALES].sort()).toEqual([...locales].sort());
	});

	test('are named after the version they hold', () => {
		for (const [name, source] of Object.entries(files)) {
			const document = parseTermsDocument({ source, name });
			expect(name).toBe(`./terms/v${document.version}.yaml`);
		}
	});

	test('a text changes only together with its version or revision (see revisions.json)', () => {
		const pinned: Record<string, string> = revisions;
		for (const document of allTerms) {
			const key = `${document.version}.${document.revision}`;
			expect(
				pinned[key],
				`messaging terms ${key}: raise the revision (wording) or the version (meaning), then pin the new hash in revisions.json`
			).toBe(documentHash(document));
		}
	});

	test('the current terms are the newest version', () => {
		expect(currentTerms.version).toBe(Math.max(...allTerms.map((document) => document.version)));
	});

	test('they say who reads along, that the trusted persons are the exception, and where to turn in an emergency', () => {
		const german = termsInLocale({ document: currentTerms, locale: 'de' });
		const text = german.sections
			.flatMap((section) => [...section.paragraphs, section.callout ?? ''])
			.join(' ');
		expect(text).toContain('Teilnehmendenbetreuung');
		expect(text).toContain('Vertrauenspersonen');
		expect(text).toContain('112');
	});
});

const minimal = (overrides: string) => `
version: 3
revision: 0
intro: { de: Hallo, en: Hello }
sections:
  - id: purpose
    icon: chats-circle
    title: { de: Zweck, en: Purpose }
    summary: { de: Kurz, en: Short }
    body: { de: [Absatz], en: [Paragraph] }
confirmations:
  - id: read
    text: { de: Gelesen, en: Read }
${overrides}`;

describe('parseTermsDocument', () => {
	test('reads a valid file', () => {
		const document = parseTermsDocument({ source: minimal(''), name: 'v3.yaml' });
		expect(document.sections[0].body.en).toEqual(['Paragraph']);
		expect(document.sections[0].callout).toBeUndefined();
	});

	test('refuses a file missing a locale, naming it', () => {
		const source = minimal('').replace('intro: { de: Hallo, en: Hello }', 'intro: { de: Hallo }');
		expect(() => parseTermsDocument({ source, name: 'v3.yaml' })).toThrow(/v3\.yaml/);
	});

	test('refuses unknown keys and duplicate ids', () => {
		expect(() => parseTermsDocument({ source: minimal('extra: 1'), name: 'v3.yaml' })).toThrow();
		const twice = minimal(`  - id: read
    text: { de: Nochmal, en: Again }`);
		expect(() => parseTermsDocument({ source: twice, name: 'v3.yaml' })).toThrow(/unique/);
	});
});

describe('latestTerms', () => {
	const v3 = parseTermsDocument({ source: minimal(''), name: 'v3.yaml' });
	const v4 = { ...v3, version: 4 };

	test('the highest version stands, whatever order the files come in', () => {
		expect(latestTerms([v4, v3]).version).toBe(4);
		expect(latestTerms([v3, v4]).version).toBe(4);
	});

	test('two files of one version are a mistake', () => {
		expect(() => latestTerms([v3, { ...v3 }])).toThrow();
	});
});

describe('contentHash', () => {
	const document = parseTermsDocument({ source: minimal(''), name: 'v3.yaml' });

	test('differs by locale and by every word', () => {
		const german = contentHash(termsInLocale({ document, locale: 'de' }));
		expect(contentHash(termsInLocale({ document, locale: 'en' }))).not.toBe(german);
		const changed = { ...document, intro: { ...document.intro, de: 'Hallo!' } };
		expect(contentHash(termsInLocale({ document: changed, locale: 'de' }))).not.toBe(german);
		expect(contentHash(termsInLocale({ document, locale: 'de' }))).toBe(german);
	});
});

describe('acceptanceHolds', () => {
	const document = parseTermsDocument({ source: minimal(''), name: 'v3.yaml' });

	test('the current version with every confirmation', () => {
		expect(
			acceptanceHolds({ document, acceptance: { version: 3, confirmationIds: ['read'] } })
		).toBe(true);
	});

	test('not an older version, nor one missing a confirmation the terms now ask for', () => {
		expect(
			acceptanceHolds({ document, acceptance: { version: 2, confirmationIds: ['read'] } })
		).toBe(false);
		expect(acceptanceHolds({ document, acceptance: { version: 3, confirmationIds: [] } })).toBe(
			false
		);
	});
});
