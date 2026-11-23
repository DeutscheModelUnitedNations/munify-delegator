import { m } from '#lib/paraglide/messages';
import type { PaperField } from './fields';

/** What each field is called: in the layout editor, and in what a scan notes about it. */
export const fieldLabel: Record<PaperField, () => string> = {
	termsAccepted: () => m.paperFieldTermsAccepted(),
	termsPlaceDate: () => m.paperFieldPlaceDate(),
	termsSignature: () => m.paperFieldSignature(),
	guardianChildName: () => m.paperFieldChildName(),
	guardianPlaceDate: () => m.paperFieldPlaceDate(),
	guardian1Name: () => m.paperFieldGuardianName({ number: 1 }),
	guardian2Name: () => m.paperFieldGuardianName({ number: 2 }),
	guardian1Signature: () => m.paperFieldGuardianSignature({ number: 1 }),
	guardian2Signature: () => m.paperFieldGuardianSignature({ number: 2 }),
	mediaPhoto: () => m.paperFieldMediaPhoto(),
	mediaVideo: () => m.paperFieldMediaVideo(),
	mediaByDmun: () => m.paperFieldMediaByDmun(),
	mediaByOthers: () => m.paperFieldMediaByOthers(),
	mediaInternal: () => m.paperFieldMediaInternal(),
	mediaDocumentation: () => m.paperFieldMediaDocumentation(),
	mediaPapers: () => m.paperFieldMediaPapers(),
	mediaPress: () => m.paperFieldMediaPress(),
	mediaWebsite: () => m.paperFieldMediaWebsite(),
	mediaSocial: () => m.paperFieldMediaSocial(),
	mediaSearch: () => m.paperFieldMediaSearch(),
	mediaAdvertising: () => m.paperFieldMediaAdvertising(),
	mediaPlaceDate: () => m.paperFieldPlaceDate(),
	mediaSignature: () => m.paperFieldSignature(),
	mediaGuardian1Name: () => m.paperFieldGuardianName({ number: 1 }),
	mediaGuardian2Name: () => m.paperFieldGuardianName({ number: 2 }),
	mediaGuardianPlaceDate: () => m.paperFieldGuardianPlaceDate(),
	mediaGuardian1Signature: () => m.paperFieldGuardianSignature({ number: 1 }),
	mediaGuardian2Signature: () => m.paperFieldGuardianSignature({ number: 2 })
};
