import { CERTIFICATE_SECRET } from '$app/env/private';
import { signClaims, type SignedCodeClaims, type SignedCodeKeys } from '#lib/signedCode/signedCode';

/** DER prefix of a PKCS#8 Ed25519 private key, which ends in the 32-byte seed. */
const PKCS8_ED25519_PREFIX = Uint8Array.from([
	0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
]);

/**
 * The key ids the deployment publishes, the one it signs with last. Rotating the keys means
 * appending the next id: codes issued under the earlier ones keep verifying as long as their id
 * stays in this list, and dropping an id revokes every code signed with it.
 */
const KEY_IDS = [1] as const;
const SIGNING_KID = KEY_IDS[KEY_IDS.length - 1];

/**
 * Derives the key pair of `kid` from `CERTIFICATE_SECRET`, under a label of its own: the keys
 * survive redeploys and every instance agrees on them without storing any, and a signature made
 * for something else (the RS256 certificates of before) is worthless here.
 */
async function deriveKeys(kid: number) {
	const secret = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(CERTIFICATE_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const seed = new Uint8Array(
		await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(`munify-signed-code-${kid}`))
	);
	const pkcs8 = new Uint8Array([...PKCS8_ED25519_PREFIX, ...seed]);
	const privateKey = await crypto.subtle.importKey('pkcs8', pkcs8, 'Ed25519', true, ['sign']);
	const { x } = await crypto.subtle.exportKey('jwk', privateKey);
	if (!x) throw new Error('Could not derive the signed code public key');
	return { privateKey, publicKey: x };
}

const derived = new Map<number, ReturnType<typeof deriveKeys>>();

/**
 * The key pair of `kid`, derived on first use, not when the module loads: `vite build` evaluates
 * the module to analyse the routes without the deployment's environment, where the secret is the
 * empty placeholder and an HMAC key of zero length fails the build.
 */
function keysOf(kid: number) {
	let keys = derived.get(kid);
	if (!keys) {
		keys = deriveKeys(kid);
		derived.set(kid, keys);
	}
	return keys;
}

/** The public keys codes are checked against, by key id, raw and base64url. */
export async function signedCodeKeys(): Promise<SignedCodeKeys> {
	const entries = await Promise.all(
		KEY_IDS.map(async (kid) => [kid, (await keysOf(kid)).publicKey] as const)
	);
	return new Map(entries);
}

/** Signs `claims` with the current key, answering the code in the scanner safe alphabet. */
export async function signCode(claims: SignedCodeClaims) {
	const { privateKey } = await keysOf(SIGNING_KID);
	return signClaims({
		claims,
		kid: SIGNING_KID,
		sign: async (bytes) => new Uint8Array(await crypto.subtle.sign('Ed25519', privateKey, bytes))
	});
}
