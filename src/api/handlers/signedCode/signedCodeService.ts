import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import type { CertificateJWTPayload } from '#lib/helpers/certificateJwt';
import {
	LIVE_CODE_VALIDITY_SECONDS,
	looksLikeSignedCode,
	verifySignedCode,
	type SignedCodeKind
} from '#lib/signedCode/signedCode';
import { signCode, signedCodeKeys } from './signingKeys';

const secondsOf = (now: number) => Math.floor(now / 1000);

/** The digital nametag's code for `userId` in the conference, good for ten minutes from `now`. */
export function issueLiveCode({
	userId,
	conferenceId,
	now = Date.now()
}: {
	userId: string;
	conferenceId: string;
	now?: number;
}) {
	const issuedAt = secondsOf(now);
	return signCode({
		kind: 'live',
		userId,
		conferenceId,
		issuedAt,
		expiresAt: issuedAt + LIVE_CODE_VALIDITY_SECONDS
	});
}

/** The code printed on the application documents of `userId` in the conference. */
export function issuePrintCode({
	userId,
	conferenceId,
	now = Date.now()
}: {
	userId: string;
	conferenceId: string;
	now?: number;
}) {
	return signCode({ kind: 'print', userId, conferenceId, issuedAt: secondsOf(now) });
}

/** The largest card number a card carries; a reprint past it is refused. */
export const MAX_NSA_CARD_NUMBER = 0xffff;

/**
 * When an NSA card for a conference ending on `endConference` stops counting: the end of the day
 * after that day (Unix seconds, UTC).
 */
export function nsaCardExpiry(endConference: Date) {
	const end = new Date(endConference);
	end.setUTCHours(0, 0, 0, 0);
	return secondsOf(end.getTime()) + 2 * 24 * 60 * 60;
}

/** The code on an NSA's printed card in the conference, with the person's current card number. */
export function issueNsaCardCode({
	userId,
	conferenceId,
	endConference,
	cardNumber,
	now = Date.now()
}: {
	userId: string;
	conferenceId: string;
	endConference: Date;
	cardNumber: number;
	now?: number;
}) {
	return signCode({
		kind: 'nsaCard',
		userId,
		conferenceId,
		issuedAt: secondsOf(now),
		expiresAt: nsaCardExpiry(endConference),
		cardNumber
	});
}

/** The code of a participation certificate stating `certificate`. */
export function issueCertificateCode({
	certificate,
	now = Date.now()
}: {
	certificate: CertificateJWTPayload;
	now?: number;
}) {
	return signCode({ kind: 'certificate', certificate, issuedAt: secondsOf(now) });
}

/** Checks the signed code in `text` (a link or the bare code) against the published keys. */
export async function verifyCode({ text, now }: { text: string; now?: number }) {
	return verifySignedCode({ text, keys: await signedCodeKeys(), now });
}

const refusals = {
	malformed: m.scanCodeForged,
	unknownKey: m.scanCodeForged,
	forged: m.scanCodeForged,
	expired: m.scanCodeExpired
};

/**
 * The user a scanned code leads to in the conference. A signed code has to be genuine, of one of
 * `kinds` and for this conference (INVALID_INPUT otherwise); anything else is taken as the user id
 * it is - a printed nametag's barcode, or a person picked or typed in by hand.
 */
export async function scannedUserId({
	code,
	conferenceId,
	kinds
}: {
	code: string;
	conferenceId: string;
	kinds: readonly SignedCodeKind[];
}) {
	if (!looksLikeSignedCode(code)) return code;
	const checked = await verifyCode({ text: code });
	if (!checked.valid) {
		throw apiError({ code: 'INVALID_INPUT', message: refusals[checked.reason]() });
	}
	const { claims } = checked;
	if (claims.kind === 'certificate' || !kinds.includes(claims.kind)) {
		throw apiError({ code: 'INVALID_INPUT', message: m.scanCodeWrongKind() });
	}
	if (claims.conferenceId !== conferenceId) {
		throw apiError({ code: 'INVALID_INPUT', message: m.scanCodeOtherConference() });
	}
	return claims.userId;
}
