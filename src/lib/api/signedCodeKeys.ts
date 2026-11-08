import { client } from '#lib/api/rumbleClient/client';
import type { SignedCodeKeys } from '#lib/signedCode/signedCode';

const STORAGE_KEY = 'signedCodeKeys';

let loaded: Promise<SignedCodeKeys> | null = null;

function toKeys(entries: readonly { kid: number; publicKey: string }[]): SignedCodeKeys {
	return new Map(entries.map(({ kid, publicKey }) => [kid, publicKey]));
}

function readStoredKeys(): SignedCodeKeys | null {
	try {
		const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
		if (!Array.isArray(stored)) return null;
		const entries = stored.filter(
			(entry): entry is { kid: number; publicKey: string } =>
				typeof entry?.kid === 'number' && typeof entry?.publicKey === 'string'
		);
		return entries.length > 0 ? toKeys(entries) : null;
	} catch {
		return null;
	}
}

/**
 * The deployment's public keys, fetched once and kept in the browser: the scanner has to keep
 * checking codes when the network drops, and the keys only change when they are rotated.
 */
export function loadSignedCodeKeys(): Promise<SignedCodeKeys> {
	loaded ??= client.query
		.signedCodeKeys({ kid: true, publicKey: true })
		.then((entries) => {
			const plain = entries.map(({ kid, publicKey }) => ({ kid, publicKey }));
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
			} catch {
				// storage may be blocked; the keys then live for this page load only
			}
			return toKeys(plain);
		})
		.catch((error) => {
			loaded = null;
			const stored = readStoredKeys();
			if (stored) return stored;
			throw error;
		});
	return loaded;
}

/** Fetches the keys ahead of the first scan, so an early scan does not wait for them. */
export function warmUpSignedCodeKeys() {
	loadSignedCodeKeys().catch(() => undefined);
}
