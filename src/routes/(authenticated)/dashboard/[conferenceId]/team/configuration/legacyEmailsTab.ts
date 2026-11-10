/**
 * Where an old link to the settings' former e-mail tab (`team/configuration?tab=emails`) now
 * leads: the e-mail page next to it, locale prefix kept. `undefined` for every other link.
 */
export function emailsPageForLegacyTab(url: URL): string | undefined {
	if (url.searchParams.get('tab') !== 'emails') return undefined;
	return url.pathname.replace(/\/configuration\/?$/, '/emails');
}
