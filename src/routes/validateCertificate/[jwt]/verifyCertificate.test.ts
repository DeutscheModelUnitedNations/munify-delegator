import { describe, expect, test, vi } from 'vitest';

vi.mock('#lib/api/rumbleClient/client.js', () => ({ client: {} }));

const { certificateFacts, certificatePublicKey } = await import('./verifyCertificate');

describe('certificatePublicKey', () => {
	test('takes the published key, defaulting the algorithm', () => {
		expect(certificatePublicKey({ kty: 'RSA', alg: null, e: 'AQAB', n: 'abc' })).toEqual({
			kty: 'RSA',
			alg: 'RS256',
			e: 'AQAB',
			n: 'abc'
		});
		expect(certificatePublicKey({ kty: 'RSA', alg: 'RS512', e: null, n: null })).toEqual({
			kty: 'RSA',
			alg: 'RS512',
			e: undefined,
			n: undefined
		});
	});

	test('refuses without a key type', () => {
		expect(() => certificatePublicKey(null)).toThrow('Missing JWK public key');
		expect(() => certificatePublicKey({ kty: null })).toThrow('Missing JWK public key');
	});
});

describe('certificateFacts', () => {
	test('reads the holder, the conference, its dates and the sessions attended', () => {
		const start = Date.UTC(2026, 2, 1);
		const end = Date.UTC(2026, 2, 4);
		expect(
			certificateFacts({
				n: 'Ada Lovelace',
				t: 'MUN-SH 2026',
				s: start,
				e: end,
				a: [
					['Opening', 1],
					['Plenary', 0]
				]
			})
		).toEqual({
			fullName: 'Ada Lovelace',
			conferenceTitle: 'MUN-SH 2026',
			conferenceStartDate: new Date(start),
			conferenceEndDate: new Date(end),
			sessions: [{ name: 'Opening', attended: true }]
		});
	});

	test('leaves out dates the certificate does not carry', () => {
		expect(certificateFacts({ n: 'A', t: 'T', s: 0, e: 0 })).toMatchObject({
			conferenceStartDate: undefined,
			conferenceEndDate: undefined,
			sessions: []
		});
	});
});
