# Typst assets

Files the Typst compiler reads when the app sets PDFs (`docs/architecture/pdf-templates.md`). The
folder is copied into the image (`Dockerfile`); the compiler has no network.

- `fonts/` — Outfit, the DMUN Hausschrift, as static TTFs (Typst 0.10 reads neither WOFF nor
  variable weights). SIL Open Font License, `fonts/OFL.txt`; from github.com/Outfitio/Outfit-Fonts.
- `logos/` — the Wort-Bild-Marken of DMUN, MUN-SH and MUNBW with the written-out name, in colour
  (`<brand>-lang.svg`) and white for the dark background (`<brand>-lang-darkmode.svg`). Final files
  from DMUN's CDN (`https://cdn.dmun.de/cdn/logos/`, indexed in `manifest.json`); the clear space
  (Schutzzone) is part of each file. Replace them from there, never edit them.
