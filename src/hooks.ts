import type { Reroute } from '@sveltejs/kit/hooks';
import { deLocalizeUrl } from '#lib/paraglide/runtime';

/**
 * A signed code's link is all uppercase (`signedCodeLink`), which is what keeps its QR code small,
 * so `/ID/` is routed to `/id/` like any other casing; the code itself is read in any case.
 */
const SIGNED_CODE_PATH = /^\/id\//i;

export const reroute: Reroute = (request) => {
	const pathname = deLocalizeUrl(request.url).pathname;
	return pathname.replace(SIGNED_CODE_PATH, '/id/');
};
