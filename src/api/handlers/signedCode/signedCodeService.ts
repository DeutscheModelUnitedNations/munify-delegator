import { z } from 'zod';
import { db } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { resolveDocumentLayout } from '#lib/helpers/documentLayout';
import { areasAsPrinted, encodeAreas, type PrintedInk } from '#lib/paperScan/areas';
import { pageAreas, POSTAL_DOCUMENTS, type PrintedPage } from '#lib/paperScan/pageAreas';
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

/**
 * The arguments of `issueDocumentCodes`: up to 60 pages, each of a postal document, a page of its
 * template (from 0) and its size in points; and for a test print the layouts and switch as the
 * team is editing them.
 */
export const documentCodesArgsSchema = z.looseObject({
	pages: z
		.array(
			z.object({
				document: z.enum(POSTAL_DOCUMENTS),
				page: z.number().int().min(0).max(99),
				width: z.number().min(50).max(5000),
				height: z.number().min(50).max(5000),
				printedInk: z
					.array(
						z.object({
							field: z.string().max(60),
							ink: z.number().min(0).max(1),
							core: z.number().min(0).max(1),
							clear: z
								.object({ top: z.number().min(0).max(500), bottom: z.number().min(0).max(500) })
								.nullish()
						})
					)
					.max(40)
					.nullish()
			}),
			{ error: () => m.documentCodesInvalidPages() }
		)
		.min(1, { error: () => m.documentCodesInvalidPages() })
		.max(60, { error: () => m.documentCodesInvalidPages() })
});

/** A page as the client says it is; only the print in fields that are on it counts. */
type PrintedPageArgs = Omit<PrintedPage, 'printedInk'> & {
	printedInk?: readonly (Omit<PrintedInk, 'field'> & { field: string })[] | null;
};

/**
 * The codes printed on the pages of the application documents of `userId` in the conference, one
 * per page in the order given, each carrying where its page's alignment marks and fields are, and the
 * print in those (as measured by whoever prints: no mark is made of it; not measured, a person looks at
 * the fields), from
 * the stored layouts (`layouts` stand in for them in a test print of a layout being edited).
 */
export async function issuePrintCodes({
	userId,
	conferenceId,
	pages,
	draft,
	now = Date.now()
}: {
	userId: string;
	conferenceId: string;
	pages: readonly PrintedPageArgs[];
	draft?: { layouts: unknown };
	now?: number;
}) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { documentLayouts: true }
	});
	if (!conference) throw apiError({ code: 'NOT_FOUND', message: m.conferenceNotFound() });
	const layouts = draft ? draft.layouts : conference.documentLayouts;
	const issuedAt = secondsOf(now);
	return Promise.all(
		pages.map(({ document, page, width, height, printedInk }) => {
			const placed = pageAreas({
				document,
				layout: resolveDocumentLayout({ document, stored: layouts }),
				page,
				size: { width, height }
			});
			const measured = printedInk?.flatMap((print) => {
				const onPage = placed.areas.find(({ field }) => field === print.field);
				return onPage ? [{ ...print, field: onPage.field }] : [];
			});
			const fields = {
				...placed,
				areas: areasAsPrinted({ areas: placed.areas, printedInk: measured })
			};
			const areas = fields.areas.length > 0 ? encodeAreas(fields) : undefined;
			return signCode({ kind: 'print', userId, conferenceId, issuedAt, areas });
		})
	);
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
