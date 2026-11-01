import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { breadcrumbs, matchPage, pageSegments, staticFirst } from './breadcrumbs';

/** Every `+page.svelte` under this folder, named the way `import.meta.glob('./**‌/+page*.svelte')` does */
function pageKeys(dir = __dirname, prefix = '.'): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (entry.isDirectory()) return pageKeys(join(dir, entry.name), `${prefix}/${entry.name}`);
		return entry.name === '+page.svelte' ? [`${prefix}/${entry.name}`] : [];
	});
}

const keys = staticFirst(pageKeys());
const isParameter = (segment: string) => segment.startsWith('[') && segment.endsWith(']');

describe('breadcrumbs of every authenticated page', () => {
	test('finds the pages', () => {
		expect(keys.length).toBeGreaterThan(50);
	});

	test('no page sits inside a route group, which the breadcrumbs cannot see through', () => {
		const grouped = keys.filter((key) => key.includes('/('));
		expect(grouped).toEqual([]);
	});

	test('every segment of every page has a title and an icon', () => {
		const missing = new Set<string>();
		for (const key of keys) {
			for (const segment of pageSegments(key)) {
				const name = isParameter(segment) ? segment.slice(1, -1) : segment;
				// The conference in the URL is drawn as the conference switcher, not by a title
				if (name !== 'conferenceId' && !breadcrumbs[name]) missing.add(`${name} (${key})`);
			}
		}
		expect([...missing]).toEqual([]);
	});

	test('every page’s own URL resolves to that page, not to another one', () => {
		const wrong: string[] = [];
		for (const key of keys) {
			const url = pageSegments(key).map((segment, index) =>
				isParameter(segment) ? `value-${index}` : segment
			);
			const matched = matchPage({ urlSegments: url, globKeys: keys });
			if (matched !== key) wrong.push(`${url.join('/')} -> ${matched} (expected ${key})`);
		}
		expect(wrong).toEqual([]);
	});

	test('a URL with no page matches nothing', () => {
		expect(matchPage({ urlSegments: ['dashboard', 'x', 'team'], globKeys: keys })).toBeUndefined();
	});
});
