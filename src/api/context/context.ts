import { oidc } from './oidc';
import { permissions } from './permissions';
import type { RequestEvent } from '@sveltejs/kit';

export async function context(req: RequestEvent) {
	const oidcValue = await oidc(req.cookies);
	const perms = permissions(oidcValue);
	return { permissions: perms, oidc: oidcValue, url: req.url };
}

export type Context = Awaited<ReturnType<typeof context>>;
