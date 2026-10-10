import { m } from '$lib/paraglide/messages';
import { client } from '$lib/api/rumbleClient/client';
import {
	looksLikeIdentityCode,
	verifyIdentityCode,
	type IdentityCodeCheck
} from '$lib/helpers/identityCode';

const STORAGE_KEY = 'identityCodePublicKey';

let loadedKey: Promise<string> | null = null;

/**
 * The deployment's public key, fetched once and kept in the browser: the scanner has to keep
 * checking codes when the network drops, and the key never changes short of a new secret.
 */
function loadPublicKey(): Promise<string> {
	loadedKey ??= client.query
		.identityCodePublicKey({ publicKey: true })
		.then(({ publicKey }) => {
			try {
				localStorage.setItem(STORAGE_KEY, publicKey);
			} catch {
				// storage may be blocked; the key then lives for this page load only
			}
			return publicKey;
		})
		.catch((error) => {
			loadedKey = null;
			const stored = readStoredKey();
			if (stored) return stored;
			throw error;
		});
	return loadedKey;
}

function readStoredKey() {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

/** Fetches the key ahead of the first scan, so an early scan does not wait for it. */
export function warmUpIdentityKey() {
	loadPublicKey().catch(() => undefined);
}

type RejectedReason = Extract<IdentityCodeCheck, { valid: false }>['reason'] | 'unsigned' | 'noKey';

type ScannedQr = { valid: true; userId: string } | { valid: false; reason: RejectedReason };

/**
 * What a QR code read by the camera stands for. A digital QR code is easy to make for anybody, so
 * it must be a genuine identity code; a bare user id or any other text in a QR code is refused.
 * (Printed barcodes are not checked here: the team judges the nametag they hold.)
 */
async function checkScannedQr(code: string): Promise<ScannedQr> {
	if (!looksLikeIdentityCode(code)) return { valid: false, reason: 'unsigned' };
	let key: string;
	try {
		key = await loadPublicKey();
	} catch {
		return { valid: false, reason: 'noKey' };
	}
	return verifyIdentityCode(code, key);
}

const rejectedMessages = {
	forged: m.scanCodeForged,
	expired: m.scanCodeExpired,
	malformed: m.scanCodeForged,
	unsigned: m.scanCodeUnsigned,
	noKey: m.scanCodeNoKey
};

export type AcceptedCode = { accepted: true; code: string } | { accepted: false; message: string };

/**
 * The code to work with after a scan. A QR code must be a genuine identity code, and so must an
 * identity code that merely arrives typed (a keyboard scanner types what it reads); the user id it
 * stands for is what comes back. Anything else (a printed barcode, a typed or picked code) is taken
 * as it is: the team judges whether the nametag they hold is one we issued.
 */
export async function acceptScannedCode(
	code: string,
	format: string | null
): Promise<AcceptedCode> {
	if (format !== 'qr_code' && !looksLikeIdentityCode(code)) return { accepted: true, code };
	const checked = await checkScannedQr(code);
	if (checked.valid) return { accepted: true, code: checked.userId };
	return { accepted: false, message: rejectedMessages[checked.reason]() };
}
