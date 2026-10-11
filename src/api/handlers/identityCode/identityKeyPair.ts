import { configPrivate } from '$config/private';
import { encodeIdentityCode, identityCodeMessage } from '$lib/helpers/identityCode';

/** DER prefix of a PKCS#8 Ed25519 private key, which ends in the 32-byte seed. */
const PKCS8_ED25519_PREFIX = Uint8Array.from([
	0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
]);

/**
 * The deployment's identity key pair. Like the certificates' key pair it is derived from
 * `CERTIFICATE_SECRET`, so it survives redeploys and every instance agrees on it, but under a
 * label of its own: a signature made for one purpose is worthless for the other.
 */
const keys = (async () => {
	const secret = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(configPrivate.CERTIFICATE_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const seed = new Uint8Array(
		await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode('munify-identity-key-v1'))
	);
	const pkcs8 = new Uint8Array([...PKCS8_ED25519_PREFIX, ...seed]);
	const privateKey = await crypto.subtle.importKey('pkcs8', pkcs8, 'Ed25519', true, ['sign']);
	const { x } = await crypto.subtle.exportKey('jwk', privateKey);
	if (!x) throw new Error('Could not derive the identity public key');
	return { privateKey, publicKey: x };
})();

/** The key a scanner checks codes against: raw, base64url. */
export async function identityPublicKey() {
	return (await keys).publicKey;
}

/** A signed code for `userId`, good for `IDENTITY_CODE_VALIDITY_MS` from `now`. */
export async function issueIdentityCode(userId: string, now = Date.now()) {
	const issuedAtSeconds = Math.floor(now / 1000);
	const signature = new Uint8Array(
		await crypto.subtle.sign(
			'Ed25519',
			(await keys).privateKey,
			identityCodeMessage(userId, issuedAtSeconds)
		)
	);
	return encodeIdentityCode(userId, issuedAtSeconds, signature);
}
