import lightTheme from '@deutschemodelunitednations/corporate-identity/css/theme/dmun-light?raw';
import shades from '@deutschemodelunitednations/corporate-identity/css/shades/dmun?raw';
import fonts from '@deutschemodelunitednations/corporate-identity/css/fonts?raw';

/** The value of a custom property the CI's CSS declares; throws when it is gone, so drift fails loudly. */
export function cssVariable({ css, name }: { css: string; name: string }) {
	const value = new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();
	if (!value) throw new Error(`The corporate identity declares no ${name}`);
	return value;
}

const light = (name: string) => cssVariable({ css: lightTheme, name });

/**
 * The DMUN corporate design for mails, read from the same CSS the app imports
 * (`@deutschemodelunitednations/corporate-identity`, the light theme): mails cannot load the
 * app's CSS, so every template styles inline with these.
 */
export const brand = {
	/** Buttons and links. */
	primary: light('--color-primary'),
	/** Text on `primary`. */
	primaryContent: light('--color-primary-content'),
	/** The header and headings. */
	navy: light('--color-neutral'),
	/** Text on `navy`. */
	navyContent: light('--color-neutral-content'),
	/** The mail's body. */
	surface: light('--color-base-100'),
	/** The page around the mail. */
	page: light('--color-base-200'),
	/** Rules. */
	rule: light('--color-base-300'),
	text: light('--color-neutral'),
	/** Small print. */
	muted: cssVariable({ css: shades, name: '--color-secondary-700' }),
	/** The buttons' near-square corners. */
	radius: light('--radius-field'),
	font: cssVariable({ css: fonts, name: '--font-family-sans' }),
	/** The CI's typefaces, for clients that load web fonts (Apple Mail, iOS, some webmail). */
	fontUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@200;400;700&display=swap'
} as const;

/** Body text. */
export const textStyle = `font-size: 16px; line-height: 1.6; color: ${brand.text}; margin: 0 0 16px;`;

/** Small print: expiry notes, fallback links, who the mail went to. */
export const smallStyle = `font-size: 13px; line-height: 1.5; color: ${brand.muted}; margin: 0 0 8px;`;

export const ruleStyle = `border: none; border-top: 1px solid ${brand.rule}; margin: 24px 0;`;
