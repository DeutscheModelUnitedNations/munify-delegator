import { toast } from 'svelte-sonner';
import { client } from '#lib/api/rumbleClient/client';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import { downloadCompleteCertificate } from '#lib/utils/pdfGenerator';
import { resolveDocumentLayout } from '#lib/helpers/documentLayout';
import {
	certificateContentsOf,
	documentFileName
} from '#lib/components/userCard/tabs/statusDownloads';

/**
 * Generates somebody else's participation certificate and hands it to the browser, for those the
 * API issues it to on their behalf (participant care, their supervisors). Reports problems, also
 * that the API signs none (as while their attendance is not recorded), as toasts rather than
 * throwing.
 */
export async function downloadCertificateFor({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	try {
		if (!(await download({ conferenceId, userId }))) toast.error(m.certificateDownloadError());
	} catch (error) {
		logger.error('Error generating PDF', error);
		toast.error(m.certificateDownloadError());
	}
}

/** False when the API signs no certificate for the person. */
async function download({ conferenceId, userId }: { conferenceId: string; userId: string }) {
	const [conference, signed, user] = await Promise.all([
		client.query.conference({
			__args: { id: conferenceId },
			certificateFile: { url: true },
			documentLayouts: true,
			qrCorporateDesign: true,
			title: true
		}),
		client.query.getCertificate({
			__args: { conferenceId, userId },
			code: true,
			fullName: true,
			sessions: true
		}),
		client.query.user({ __args: { id: userId }, givenName: true, familyName: true })
	]);
	const certificate = certificateContentsOf(signed);
	if (!certificate) return false;
	await downloadCompleteCertificate({
		data: certificate,
		certificate: conference.certificateFile?.url,
		fileName: documentFileName({ user, document: 'certificate' }),
		layout: resolveDocumentLayout({ document: 'certificate', stored: conference.documentLayouts }),
		corporate: conference.qrCorporateDesign
	});
	return true;
}
