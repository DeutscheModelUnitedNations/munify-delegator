import { m } from '#lib/paraglide/messages';
import type { ElementOf, LayoutDocument } from '#lib/helpers/documentLayout';

/** Every element any document has. */
export type LayoutElement = { [D in LayoutDocument]: ElementOf<D> }[LayoutDocument];

/** What the layout editor calls each element. */
export const elementLabel: Record<LayoutElement, () => string> = {
	name: () => m.certificateLayoutName(),
	sessions: () => m.certificateLayoutSessions(),
	qr: () => m.certificateLayoutQr(),
	recipient: () => m.documentLayoutRecipient(),
	birthday: () => m.birthday(),
	address: () => m.address(),
	code: () => m.documentLayoutCode(),
	pageNumber: () => m.documentLayoutPageNumber()
};

/**
 * The made-up content the editor shows in each text element, line by line. The sessions are the
 * conference's own (`certificateSampleSessions`), which the editor is given.
 */
export const elementSample: Record<LayoutElement, () => string[]> = {
	name: () => ['Antonio Guterres'],
	sessions: () => [],
	qr: () => [m.certificateVerify()],
	recipient: () => ['DMUN e.V.', 'Musterstraße 1', '12345 Musterstadt', 'Deutschland'],
	birthday: () => ['30.04.1949'],
	address: () => ['405 E 45th St, New York, NY 10017, USA'],
	// the name above the id, beside the code, as printed
	code: () => ['Antonio Guterres', 'x7k2m9p4q1w8'],
	pageNumber: () => ['1 / 3']
};

/** The template each document is drawn on, as the conference selects it. */
export const templateField = {
	certificate: 'certificateFile',
	contract: 'contractFile',
	guardianConsent: 'guardianConsentFile',
	mediaConsent: 'mediaConsentFile'
} as const satisfies Record<LayoutDocument, string>;

/**
 * The sessions a certificate of the conference can list, as the certificate names them: those the
 * team keeps on the certificates, in the order they started, unnamed ones left out
 * (`certificateSessions` on the server).
 */
export function certificateSampleSessions(
	sessions: readonly { occasion: string; startedAt: Date; showOnCertificate: boolean }[]
): string[] {
	return sessions
		.filter((session) => session.showOnCertificate && session.occasion.trim())
		.toSorted((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
		.map((session) => session.occasion.trim());
}
