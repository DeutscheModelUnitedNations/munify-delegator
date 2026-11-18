/**
 * Where the provider's discovery document is. `PUBLIC_OIDC_AUTHORITY` may be the issuer
 * (`https://logto.example/oidc`) or the document itself; like openid-client, which the sign-in uses,
 * an issuer gets `/.well-known/openid-configuration` appended (OIDC Discovery §4).
 */
export function discoveryUrl(authority: string) {
	const url = new URL(authority);
	if (url.href.includes('/.well-known/')) return url;
	url.pathname = `${url.pathname.replace(/\/+$/, '')}/.well-known/openid-configuration`;
	return url;
}
