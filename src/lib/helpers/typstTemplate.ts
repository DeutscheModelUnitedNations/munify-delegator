/**
 * The DMUN corporate design for the PDFs the app sets with Typst itself (position and
 * introduction papers, committee texts; resolutions come from `munify-resolution-editor`):
 * the Hausschrift Outfit, DMUN-Blau headings, the Akzentstreifen in the conference brand's
 * accent, square text boxes on the light background. Written for the bundled Typst 0.10.
 *
 * Outfit ships in `typst-assets/fonts/` and is handed to the compiler by `#api/services/typst`; a source
 * compiled elsewhere without it falls back to DejaVu Sans.
 */

/** The three brands of the DMUN corporate design. */
export type TypstBrand = 'dmun' | 'mun-sh' | 'munbw';

/** Each brand's Akzentfarbe (DMUN CD guidelines, autumn 2026). */
const BRAND_ACCENTS: Record<TypstBrand, string> = {
	dmun: '#6D9392',
	'mun-sh': '#C81111',
	munbw: '#DC770A'
};

/**
 * The brand a conference prints in, from its series' abbreviation ("MUN-SH", "MUNBW"); DMUN's own
 * for any other or none.
 */
export function brandOfSeries(abbreviation: string | null | undefined): TypstBrand {
	const key = (abbreviation ?? '').toUpperCase().replace(/[^A-Z]/g, '');
	if (key === 'MUNSH') return 'mun-sh';
	if (key === 'MUNBW') return 'munbw';
	return 'dmun';
}

/**
 * A logo next to the source. `darkPath` is its white version for the dark background, when there
 * is one; `clearSpace` says the file carries its Schutzzone (DMUN's own logos), so it is set
 * larger for the same visible size.
 */
export type TypstLogo = { path: string; darkPath?: string; clearSpace: boolean };

/** The Typst image of a logo, its white version with `dark`. */
export function typstLogoImage({ logo, dark = false }: { logo: TypstLogo; dark?: boolean }) {
	const path = dark && logo.darkPath ? logo.darkPath : logo.path;
	return `image("${escapeTypstString(path)}", height: ${logo.clearSpace ? '2.1cm' : '1.3cm'})`;
}

/** ISO 639-3 codes Typst knows by their two-letter form (hyphenation and quotes need it). */
const TWO_LETTER_LANGUAGES: Record<string, string> = {
	deu: 'de',
	eng: 'en',
	fra: 'fr',
	spa: 'es',
	ita: 'it',
	nld: 'nl',
	por: 'pt',
	pol: 'pl',
	rus: 'ru',
	swe: 'sv',
	fin: 'fi',
	dan: 'da',
	nor: 'nb',
	ces: 'cs',
	hun: 'hu',
	tur: 'tr',
	ukr: 'uk',
	ell: 'el',
	ara: 'ar',
	zho: 'zh',
	jpn: 'ja',
	kor: 'ko'
};

/** The Typst `lang` of a conference language (ISO 639-3, `#lib/helpers/conferenceLanguage`). */
export function typstLang(language: string | null | undefined): string {
	if (!language) return 'de';
	return TWO_LETTER_LANGUAGES[language] ?? (/^[a-z]{2,3}$/.test(language) ? language : 'de');
}

/** Escape text for use inside a Typst content block or as markup: every markup-starting character. */
export function escapeTypstText(value: string): string {
	return value.replace(/[\\#$*_`<>@~[\]=/+-]/g, (c) => `\\${c}`);
}

/** Escape a string for use inside a Typst double-quoted string literal. */
export function escapeTypstString(value: string): string {
	return value.replace(/[\\"]/g, (c) => `\\${c}`);
}

/**
 * The definitions and rules every template starts with: colours, the Akzentstreifen, the type
 * roles (Überschrift 1–3, Fließtext), quotes, lists. Pages set their own margins, header and
 * footer.
 */
export function typstPreamble({ brand, lang }: { brand: TypstBrand; lang: string }): string {
	return `#let dmun-blue = rgb("#01548F")
#let dmun-navy = rgb("#1B1837")
#let dmun-tint = rgb("#F0EFF5")
#let dmun-muted = rgb("#4A4A4A")
#let dmun-accent = rgb("${BRAND_ACCENTS[brand]}")

// Der Akzentstreifen: the one rounded form, 8 px (6 pt) thick
#let dmun-stripe(color: dmun-accent, length: 2.54cm) = box(width: length, height: 6pt, radius: 3pt, fill: color)

#set text(font: ("Outfit", "DejaVu Sans"), size: 11pt, lang: "${escapeTypstString(lang)}", fill: black)
#set par(justify: false, leading: 0.42em)
#show par: set block(spacing: 1.3em)
#set heading(numbering: none)
// generic first: a later show rule takes precedence, so levels 1 and 2 override it
#show heading: it => block(above: 12pt, below: 8pt)[#text(size: 12pt, weight: "bold", it.body)]
#show heading.where(level: 1): it => block(above: 20pt, below: 14pt)[#text(size: 20pt, weight: "bold", fill: dmun-blue, it.body)]
#show heading.where(level: 2): it => block(above: 15pt, below: 11pt)[#text(size: 15pt, weight: "light", fill: dmun-blue, it.body)]
#set list(indent: 2pt, body-indent: 8pt)
#set enum(indent: 2pt, body-indent: 8pt, numbering: n => text(weight: "bold", fill: dmun-blue)[#n.])
#show quote.where(block: true): it => block(fill: dmun-tint, width: 100%, inset: (x: 14pt, top: 12pt, bottom: 14pt))[#dmun-stripe(length: 1.27cm)
  #v(4pt)
  #it.body]
#show link: set text(fill: dmun-blue)
#set figure.caption(position: top)
#show figure.caption: set text(size: 9pt)
`;
}

/**
 * A page footer: a hairline, then `left` in small muted type and the page as "1 / 3" on the
 * right. `left` is Typst content.
 */
export function typstFooter(left: string): string {
	return `[
  #line(length: 100%, stroke: 0.75pt + black)
  #v(-2pt)
  #grid(columns: (1fr, auto), column-gutter: 24pt,
    text(size: 9pt, fill: dmun-muted)[${left}],
    text(size: 9pt)[#counter(page).display("1 / 1", both: true)])
]`;
}

/**
 * A light box of labelled facts in two columns (committee, topic, …); empty without facts.
 * Labels and values are plain text.
 */
export function typstFactBox(facts: { label: string; value: string }[]): string {
	if (facts.length === 0) return '';
	const cells = facts
		.map(
			({ label, value }) =>
				`[#text(size: 9.5pt, weight: "bold")[${escapeTypstText(label)}] #linebreak() #text(size: 9.5pt)[${escapeTypstText(value)}]]`
		)
		.join(', ');
	return `#block(fill: dmun-tint, width: 100%, inset: (x: 14pt, y: 11pt))[#grid(columns: (1fr, 1fr), column-gutter: 18pt, row-gutter: 8pt, ${cells})]`;
}
