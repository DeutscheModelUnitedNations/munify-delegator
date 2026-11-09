import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Phosphor icons are font glyphs, which a screen reader can read out as a stray character, also
// inside a button's name. Every icon (an empty <i>) is aria-hidden; a control showing only an
// icon carries an aria-label, and an icon that means something on its own sits next to sr-only
// text. CLAUDE-UI.md, "Accessibility".

const SRC_DIR = join(process.cwd(), 'src');

function listFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === 'paraglide' || entry.name === 'rumbleClient' ? [] : listFiles(path);
		}
		return /\.(svelte|ts)$/.test(entry.name) ? [path] : [];
	});
}

/** An empty i element, attribute values (quoted or `{…}`, one level nested) included */
const ICON = /<i\b((?:[^>"'{]|"[^"]*"|'[^']*'|\{(?:[^{}]|\{[^{}]*\})*\})*)>\s*<\/i>/g;

describe('icons', () => {
	it('are hidden from screen readers', () => {
		const unhidden = listFiles(SRC_DIR).flatMap((file) => {
			const source = readFileSync(file, 'utf8');
			return [...source.matchAll(ICON)]
				.filter(([, attributes]) => !attributes.includes('aria-hidden'))
				.map(
					(match) => `${relative(SRC_DIR, file)}:${source.slice(0, match.index).split('\n').length}`
				);
		});
		expect(unhidden, 'add aria-hidden="true" to these icons').toEqual([]);
	});
});
