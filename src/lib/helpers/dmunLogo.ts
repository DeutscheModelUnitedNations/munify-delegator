/** Where DMUN keeps its logos, for every site of the association (listed in `/cdn/manifest.json`) */
const DMUN_LOGO_BASE = 'https://cdn.dmun.de/cdn/logos/';

/** The URL of one of DMUN's logos on its CDN, by file name (`mun-sh.svg`, `munbw-darkmode.svg`, …) */
export function dmunLogoUrl(file: string) {
	return `${DMUN_LOGO_BASE}${file}`;
}
