import { describe, expect, it } from 'vitest';
import { signClaims, type SignedCodeClaims } from '#lib/signedCode/signedCode';
import { encodeAreas } from './areas';
import { readPageOfCode } from './readScan';

const pair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
const sign = (claims: SignedCodeClaims) =>
	signClaims({
		claims,
		kid: 1,
		sign: async (bytes) =>
			new Uint8Array(await crypto.subtle.sign('Ed25519', pair.privateKey, bytes))
	});
const print = { kind: 'print', userId: 'ada', conferenceId: 'mun', issuedAt: 1 } as const;
const blank = { width: 100, height: 140, data: new Uint8ClampedArray(100 * 140 * 4).fill(255) };

describe('readPageOfCode', () => {
	it('reads nothing off a page whose code names no fields', async () => {
		expect(readPageOfCode({ picture: blank, code: await sign(print) })).toEqual([]);
		const empty = encodeAreas({ page: { width: 210, height: 297 }, areas: [] });
		expect(
			readPageOfCode({ picture: blank, code: await sign({ ...print, areas: empty }) })
		).toEqual([]);
	});

	it('cannot read a page with fields whose marks are not in the picture', async () => {
		const areas = encodeAreas({
			page: { width: 210, height: 297 },
			areas: [{ field: 'termsSignature', x: 0.1, y: 0.8, width: 0.4, height: 0.05 }]
		});
		expect(readPageOfCode({ picture: blank, code: await sign({ ...print, areas }) })).toBeNull();
	});

	it('reads nothing off a code of another kind', async () => {
		const live = { ...print, kind: 'live', expiresAt: 2 } as const;
		expect(readPageOfCode({ picture: blank, code: await sign(live) })).toEqual([]);
	});
});
