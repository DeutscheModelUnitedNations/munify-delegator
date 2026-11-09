import { describe, expect, it } from 'vitest';
import { discoveryUrl } from './discoveryUrl';

describe('discoveryUrl', () => {
	it('appends the discovery path to an issuer, as the sign-in does', () => {
		expect(discoveryUrl('https://idp.example/oidc').href).toBe(
			'https://idp.example/oidc/.well-known/openid-configuration'
		);
		expect(discoveryUrl('https://idp.example/oidc/').href).toBe(
			'https://idp.example/oidc/.well-known/openid-configuration'
		);
		expect(discoveryUrl('https://idp.example').href).toBe(
			'https://idp.example/.well-known/openid-configuration'
		);
	});

	it('keeps a discovery document as it is', () => {
		expect(discoveryUrl('https://idp.example/oidc/.well-known/openid-configuration').href).toBe(
			'https://idp.example/oidc/.well-known/openid-configuration'
		);
	});
});
