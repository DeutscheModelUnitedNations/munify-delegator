import { CERTIFICATE_SECRET } from '$app/env/private';

/**
 * A Slack bot token at rest. The database holds it encrypted (AES-256-GCM) under a key derived
 * from `CERTIFICATE_SECRET` with a label of its own, so a copy of the database alone writes into
 * no workspace, and every instance agrees on the key without storing one.
 */

let key: Promise<CryptoKey> | undefined;

/** Derived on first use, not when the module loads (`vite build` runs without the secret). */
function tokenKey() {
	key ??= (async () => {
		const secret = await crypto.subtle.importKey(
			'raw',
			new TextEncoder().encode(CERTIFICATE_SECRET),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const bytes = await crypto.subtle.sign(
			'HMAC',
			secret,
			new TextEncoder().encode('munify-slack-token-1')
		);
		return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
	})();
	return key;
}

const IV_LENGTH = 12;

export async function encryptSlackToken(token: string) {
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const sealed = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		await tokenKey(),
		new TextEncoder().encode(token)
	);
	return Buffer.concat([iv, new Uint8Array(sealed)]).toString('base64');
}

export async function decryptSlackToken(ciphertext: string) {
	const bytes = new Uint8Array(Buffer.from(ciphertext, 'base64'));
	const opened = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: bytes.subarray(0, IV_LENGTH) },
		await tokenKey(),
		bytes.subarray(IV_LENGTH)
	);
	return new TextDecoder().decode(opened);
}
