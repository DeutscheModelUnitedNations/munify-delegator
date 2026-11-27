# PDF templates (Typst)

The app sets three kinds of PDF with Typst. Two of them are laid out here, in the DMUN corporate
design; resolutions come from `munify-resolution-editor` (`resolutionToTypst`) and keep its layout.

| PDF                               | Source                                     | Compiled                                                  |
| --------------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| Position / introduction paper     | `#lib/helpers/paperTypst` (`paperToTypst`) | `/api/pdf` (`{ paper: { conferenceId, content, meta } }`) |
| Committee text (guide topic)      | `#lib/guide/guideTypst`                    | on publishing the topic page (`committeeText.ts`)         |
| Working paper, adopted resolution | `munify-resolution-editor`                 | `/api/pdf` (`{ resolution, header }`), CHASE link worker  |

## Shared template

`#lib/helpers/typstTemplate` holds what both templates share, written for the bundled Typst 0.10:

- `typstPreamble({ brand, lang })` — colours (DMUN-Blau `#01548F`, dark `#1B1837`, light
  `#F0EFF5`), the brand's Akzentfarbe, `dmun-stripe` (the Akzentstreifen, the one rounded form),
  the type roles (Überschrift 1 bold 20 pt blue, Überschrift 2 light 15 pt blue, Überschrift 3 bold
  12 pt, Fließtext 11 pt Outfit), block quotes as a light box with a stripe, blue enum numbers.
- `typstFooter(left)` — hairline, small muted text, "1 / 3".
- `typstFactBox(facts)` — the light box of labelled facts (committee, topic).
- `escapeTypstText` / `escapeTypstString` — every markup-starting character, so text (also
  `-`, `=`, `//` at a line start) never turns into markup or code.

**Brand**: `brandOfSeries` maps the conference series' abbreviation to `mun-sh` (red `#C81111`),
`munbw` (orange `#DC770A`), anything else to `dmun` (turquoise `#6D9392`). Headings stay
DMUN-Blau in every brand. **Language**: `typstLang` turns the conference's ISO 639-3 language
into Typst's `lang` (hyphenation, quotes).

## Branding on the server

`#api/services/typstBranding` (`typstBrandingOf`) reads a conference's title, series, language and
logo and writes the logo next to the source:

- **MUN-SH and MUNBW** print their official Wort-Bild-Marke from `typst-assets/logos/`
  (`copyBrandLogo`): the colour file on white, the white `-darkmode` file on the dark background.
- **Any other conference** prints its uploaded logo, else its emblem, if Typst can read its type
  (PNG, JPEG, GIF, SVG; `writeTypstImage`). Without either, a conference of another series gets
  DMUN's mark; one without a series none (it may be another organizer's).

`TypstLogo.clearSpace` marks DMUN's files, whose Schutzzone is part of the file, so they are set
larger (2.1 cm box) than an uploaded logo (1.3 cm). A logo without a white version cannot sit on
the committee text's dark block (Typst cannot recolour an image); it goes above the block on white.

Papers used to be built in the browser and sent as raw Typst; now the browser sends the editor
content and its translated labels, and the server builds the source, so the logo can be included
and the compiler sees only generated source. The `.typ` download still builds the source in the
browser, without the logo.

## Assets

`typst-assets/` (copied into the image by the `Dockerfile`; `typst-assets/README.md`):

- `fonts/` — Outfit (ExtraLight, Light, Regular, Bold; SIL OFL) as static TTFs: Typst 0.10 reads
  neither WOFF nor variable weights. `compileTypst` passes the folder with `--font-path` when it
  exists; without it the PDFs fall back to DejaVu Sans.
- `logos/` — DMUN's, MUN-SH's and MUNBW's Wort-Bild-Marke with the written-out name, colour and
  white, from `https://cdn.dmun.de/cdn/logos/` (`manifest.json`). Fetched once into the repository:
  the compiler has no network.

## Tests

`#api/services/typst.test.ts` compiles both templates with the real binary and checks that Outfit
is embedded and the official logos are there; the template modules have unit tests for their output.

## Not yet

- Upgrading Typst beyond 0.10 would bring tagged (screen-reader) PDFs and PDF/A; the templates use
  0.10 APIs (`locate`, no `context`) and need small changes then.
