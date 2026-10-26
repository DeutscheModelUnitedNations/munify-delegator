/**
 * The DMUN corporate design for mails, from `@deutschemodelunitednations/corporate-identity`
 * (the app's light theme): mails cannot load the app's CSS, so every template styles inline with
 * these. Square corners and the Outfit typeface like the app; clients without web fonts fall back
 * to the system sans-serif.
 */
export const brand = {
	/** `--color-primary`: buttons and links. */
	primary: '#01548F',
	/** `--color-neutral`: the header and headings. */
	navy: '#1B1837',
	/** `--color-base-200`: the page around the mail. */
	page: '#F0EFF5',
	/** `--color-base-300`: rules. */
	rule: '#D8D8D8',
	text: '#1B1837',
	/** `--color-secondary-700`: small print. */
	muted: '#5E5E5E',
	font: "'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	/** The CI's typefaces, for clients that load web fonts (Apple Mail, iOS, some webmail). */
	fontUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@200;400;700&display=swap'
} as const;

/** Body text. */
export const textStyle = `font-size: 16px; line-height: 1.6; color: ${brand.text}; margin: 0 0 16px;`;

/** Small print: expiry notes, fallback links, who the mail went to. */
export const smallStyle = `font-size: 13px; line-height: 1.5; color: ${brand.muted}; margin: 0 0 8px;`;

export const ruleStyle = `border: none; border-top: 1px solid ${brand.rule}; margin: 24px 0;`;
