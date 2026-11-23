import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
	AGREEMENT_FIELDS,
	AGREEMENT_GROUPS,
	type AgreementField
} from '../../../lib/paperScan/agreementDetails';
import type { ConferenceSeed } from './context';
import { addSeedFile } from './files';

/** A page that says what it stands for: the seed's people signed nothing. */
async function scanPdf() {
	const pdf = await PDFDocument.create();
	const page = pdf.addPage([595, 842]);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	page.drawText('Seed: gescannte Unterlagen', { x: 60, y: 760, size: 20, font });
	return pdf.save();
}

/** Whose paper was scanned, and what their details say other than ticked or signed. */
const SCANNED: Record<string, Partial<Record<AgreementField, 'no' | 'unclear'>>> = {
	// photos allowed in part, one box nobody could tell
	'dev-delegate': { mediaByOthers: 'no', mediaSocial: 'no', mediaAdvertising: 'unclear' },
	'dev-single': {}
};

/**
 * Scans as a scanner and a person delivered them, with the details read off them and one set by
 * hand, for the personas whose paper is in.
 */
export async function addPostalScans(cs: ConferenceSeed) {
	if (!cs.plan.with.participantStatus) return;
	const bytes = await scanPdf();
	const signed = AGREEMENT_FIELDS.filter((field) => !/^(g|mediaG)uardian/.test(field));
	for (const [userId, differing] of Object.entries(SCANNED)) {
		const { id: conferenceParticipantId, termsAndConditions } = cs.participant(userId);
		if (termsAndConditions !== 'DONE') continue;
		for (const [index, source] of (['EMAIL', 'UPLOAD'] as const).entries()) {
			const fileId = addSeedFile({
				batch: cs.batch,
				file: {
					conferenceId: cs.id,
					kind: 'postalScan',
					field: 'scan',
					bytes,
					mimeType: 'application/pdf',
					fileName: source === 'EMAIL' ? 'Stapel_1-3.pdf' : 'Nachgereicht.pdf'
				}
			});
			cs.batch.postalScan.push({
				conferenceParticipantId,
				fileId,
				source,
				pageKey: `seed-${source}`,
				fields: [...AGREEMENT_GROUPS[index * 2].fields]
			});
		}
		cs.batch.agreementDetail.push(
			...signed.map((field) => ({
				conferenceParticipantId,
				field,
				state: differing[field] ?? ('yes' as const),
				source: field === 'mediaPress' ? ('MANUAL' as const) : ('SCAN' as const)
			}))
		);
	}
}
