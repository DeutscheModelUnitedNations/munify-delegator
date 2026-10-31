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
	code: () => m.documentLayoutCode(),
	birthday: () => m.birthday(),
	address: () => m.address()
};

/** The made-up content the editor shows in each text element, line by line. */
export const elementSample: Record<LayoutElement, () => string[]> = {
	name: () => ['Antonio Guterres'],
	sessions: () => [
		m.certificateSampleSessionOpening(),
		m.certificateSampleSessionCommittees(),
		m.certificateSampleSessionClosing()
	],
	qr: () => [m.certificateVerify()],
	recipient: () => ['DMUN e.V.', 'Musterstraße 1', '12345 Musterstadt', 'Deutschland'],
	code: () => [],
	birthday: () => ['30.04.1949'],
	address: () => ['405 E 45th St, New York, NY 10017, USA']
};

/** The template each document is drawn on, as the conference selects it. */
export const templateField = {
	certificate: 'certificateFile',
	contract: 'contractFile',
	guardianConsent: 'guardianConsentFile',
	mediaConsent: 'mediaConsentFile'
} as const satisfies Record<LayoutDocument, string>;
