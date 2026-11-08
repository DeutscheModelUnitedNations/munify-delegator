import { m } from '#lib/paraglide/messages';
import { loadSignedCodeKeys } from '#lib/api/signedCodeKeys';
import {
	looksLikeSignedCode,
	parseSignedCode,
	verifySignedCode,
	type SignedCodeCheck
} from '#lib/signedCode/signedCode';

/** What a scanner takes: the signed codes of its conference it is for, and maybe printed nametags. */
export interface ScanAcceptance {
	conferenceId: string;
	/** The signed codes it takes: the digital nametag (`live`), the application documents (`print`). */
	kinds: readonly ('live' | 'print')[];
	/** Whether it takes the barcode of a printed nametag, which is a plain user id, unsigned. */
	printedNametags: boolean;
}

/**
 * What a scan comes to: refused with the reason, or the code to work with - the bare signed code,
 * which the server checks again, or the user id as it was read - and the user it leads to.
 */
export type ScanVerdict =
	{ accepted: true; code: string; userId: string } | { accepted: false; message: string };

/** The two-dimensional formats: what a printed nametag never carries, so they must be signed. */
const SIGNED_FORMATS = ['qr_code', 'data_matrix', 'aztec', 'pdf417'];

const refusals = {
	malformed: m.scanCodeForged,
	unknownKey: m.scanCodeForged,
	forged: m.scanCodeForged,
	expired: m.scanCodeExpired
};

function judgeSigned({
	check,
	acceptance
}: {
	check: SignedCodeCheck;
	acceptance: ScanAcceptance;
}): ScanVerdict {
	if (!check.valid) return { accepted: false, message: refusals[check.reason]() };
	const { claims } = check;
	if (claims.kind === 'certificate' || !acceptance.kinds.includes(claims.kind)) {
		return { accepted: false, message: m.scanCodeWrongKind() };
	}
	if (claims.conferenceId !== acceptance.conferenceId) {
		return { accepted: false, message: m.scanCodeOtherConference() };
	}
	return { accepted: true, code: check.code, userId: claims.userId };
}

/**
 * The verdict on a scan, given the check of its signature: `null` when it holds no signed code,
 * `'noKey'` when the keys could not be loaded yet. A code without a signature is taken only as
 * what it can be: a printed nametag's barcode where the scanner takes those, or a person picked or
 * typed in by hand (`format` null, since a hand scanner without a symbology prefix types like a
 * person); a QR code or any other square code without a signature is refused.
 */
export function judgeScan({
	text,
	format,
	check,
	acceptance
}: {
	text: string;
	format: string | null;
	check: SignedCodeCheck | 'noKey' | null;
	acceptance: ScanAcceptance;
}): ScanVerdict {
	if (check === 'noKey') return { accepted: false, message: m.scanCodeNoKey() };
	if (check) return judgeSigned({ check, acceptance });
	const unsignedAllowed =
		format === null || (!SIGNED_FORMATS.includes(format) && acceptance.printedNametags);
	if (!unsignedAllowed) return { accepted: false, message: m.scanCodeUnsigned() };
	return { accepted: true, code: text, userId: text };
}

/** Checks a scan in the browser, against the keys kept there, so it works without a network. */
export async function acceptScan({
	text,
	format,
	acceptance
}: {
	text: string;
	format: string | null;
	acceptance: ScanAcceptance;
}): Promise<ScanVerdict> {
	const trimmed = text.trim();
	if (!looksLikeSignedCode(trimmed)) {
		return judgeScan({ text: trimmed, format, check: null, acceptance });
	}
	let check: SignedCodeCheck | 'noKey';
	try {
		check = await verifySignedCode({ text: trimmed, keys: await loadSignedCodeKeys() });
	} catch {
		check = 'noKey';
	}
	return judgeScan({ text: trimmed, format, check, acceptance });
}

/** The user an accepted code leads to: the holder of a signed code, or the user id it is. */
export function userIdOfCode(code: string) {
	const claims = parseSignedCode(code)?.claims;
	return claims && claims.kind !== 'certificate' ? claims.userId : code;
}
