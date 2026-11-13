import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The docs kit names its icons after Font Awesome; `kitIcons.css` gives each name the glyphs of
// a Phosphor icon. Without a pair here the help button, or an admonition, shows no icon at all.

const KIT_ICONS: Record<string, string> = {
	'fa-arrow-left': 'arrow-left',
	'fa-arrow-right': 'arrow-right',
	'fa-arrow-up-right': 'arrow-up-right',
	'fa-bars': 'list',
	'fa-book': 'book-open',
	'fa-circle-exclamation': 'warning-circle',
	'fa-circle-info': 'info',
	'fa-circle-question': 'question',
	'fa-language': 'translate',
	'fa-lightbulb': 'lightbulb',
	'fa-pen-to-square': 'pencil-simple',
	'fa-route': 'path',
	'fa-triangle-exclamation': 'warning'
};

/** Font Awesome's style classes, which the app replaces through `iconPrefix` */
const STYLE_CLASSES = new Set(['fa-duotone', 'fa-solid', 'fa-sharp-duotone']);

const ROOT = process.cwd();
const KIT_DIR = join(ROOT, 'node_modules/@deutschemodelunitednations/docs-kit/dist');

function kitSources(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return kitSources(path);
		return /\.(svelte|js)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : [];
	});
}

/** The glyphs of `selector`'s two layers, as the stylesheet writes them */
function glyphs({ css, selector }: { css: string; selector: string }) {
	const escaped = selector.replaceAll('.', '\\.');
	return ['before', 'after'].map(
		(layer) =>
			css.match(new RegExp(`${escaped}:${layer} \\{\\s*content: ["'](\\\\[0-9a-f]+)["']`))?.[1]
	);
}

describe('the docs kit icons', () => {
	const aliases = readFileSync(join(ROOT, 'src/lib/docs/kitIcons.css'), 'utf8');
	const phosphor = readFileSync(
		join(ROOT, 'node_modules/@phosphor-icons/web/src/duotone/style.css'),
		'utf8'
	);

	it('all have a Phosphor counterpart', () => {
		const used = new Set(
			kitSources(KIT_DIR).flatMap((source) => source.match(/\bfa-[a-z-]+/g) ?? [])
		);
		const missing = [...used].filter((name) => !STYLE_CLASSES.has(name) && !(name in KIT_ICONS));
		expect(missing).toEqual([]);
	});

	it.each(Object.entries(KIT_ICONS))('%s draws the glyphs of %s', (kitName, phosphorName) => {
		const expected = glyphs({ css: phosphor, selector: `.ph-duotone.ph-${phosphorName}` });
		expect(expected.every(Boolean)).toBe(true);
		expect(glyphs({ css: aliases, selector: `.ph-duotone.${kitName}` })).toEqual(expected);
	});
});
