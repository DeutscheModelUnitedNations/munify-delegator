import { z } from 'zod';
import { m } from '#lib/paraglide/messages';

const LOOPBACK = ['localhost', '127.0.0.1', '[::1]'];

/** Whether an address may be linked: https, or http on this machine (development). */
export function isLinkableUrl(value: string) {
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK.includes(url.hostname));
	} catch {
		return false;
	}
}

/** A CHASE instance's address, reduced to its origin (`docs/plans/chase-link.md`). */
export const chaseUrlSchema = z
	.string()
	.trim()
	.refine(isLinkableUrl, { error: () => m.chaseLinkUrlInvalid() })
	.transform((value) => new URL(value).origin);

/** The pairing form. */
export const chaseLinkRequestSchema = z.object({ chaseUrl: chaseUrlSchema });
