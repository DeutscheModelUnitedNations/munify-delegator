import { m } from '#lib/paraglide/messages';
import type { PaperChange, PaperDocument, PaperNote } from '#lib/paperScan/proposal';

const documentName: Record<PaperDocument, () => string> = {
	contract: () => m.userAgreement(),
	guardianConsent: () => m.guardianAgreement(),
	mediaConsent: () => m.mediaAgreement()
};

const choiceName = {
	ALLOWED_ALL: () => m.mediaConsentStatusAllowedAll(),
	PARTIALLY_ALLOWED: () => m.mediaConsentStatusPartiallyAllowed(),
	NOT_ALLOWED: () => m.mediaConsentStatusNotAllowed()
};

/** What a change read off paper sets, a line each. */
export function describeChange(change: PaperChange): string[] {
	const lines: string[] = [];
	if (change.termsAndConditions)
		lines.push(m.paperChangeSigned({ document: documentName.contract() }));
	if (change.guardianConsent)
		lines.push(m.paperChangeSigned({ document: documentName.guardianConsent() }));
	if (change.mediaConsent)
		lines.push(m.paperChangeSigned({ document: documentName.mediaConsent() }));
	if (change.mediaConsentStatus)
		lines.push(m.paperChangeMedia({ choice: choiceName[change.mediaConsentStatus]() }));
	return lines;
}

/** Why something read off paper was left for a person. */
export function describeNote(note: PaperNote): string {
	switch (note.kind) {
		case 'unsigned':
			return m.paperNoteUnsigned({ document: documentName[note.document]() });
		case 'undated':
			return m.paperNoteUndated({ document: documentName[note.document]() });
		case 'unclear':
			return m.paperNoteUnclear({ document: documentName[note.document]() });
		case 'mediaChoiceUnclear':
			return m.paperNoteMediaChoiceUnclear();
		case 'mediaChoiceDiffers':
			return m.paperNoteMediaChoiceDiffers({
				read: choiceName[note.read](),
				stored: choiceName[note.stored]()
			});
	}
}
