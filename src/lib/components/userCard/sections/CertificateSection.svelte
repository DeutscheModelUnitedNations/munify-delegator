<script lang="ts">
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { downloadCompleteCertificate } from '#lib/utils/pdfGenerator';
	import { resolveDocumentLayout } from '#lib/helpers/documentLayout';
	import CollapsibleRow from './CollapsibleRow.svelte';
	import { certificateContentsOf, documentFileName } from '../tabs/statusDownloads';

	/** The person's participation certificate as a list row, generated when it is asked for. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const downloadCertificate = async () => {
		try {
			const [conferenceData, signed, user] = await Promise.all([
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
				client.query.user({ __args: { id: userId }, id: true, givenName: true, familyName: true })
			]);
			const certificate = certificateContentsOf(signed);
			if (!certificate) {
				toast.error(m.certificateDownloadError());
				return;
			}
			await downloadCompleteCertificate({
				data: certificate,
				certificate: conferenceData.certificateFile?.url,
				fileName: documentFileName({ user, document: 'certificate' }),
				layout: resolveDocumentLayout({
					document: 'certificate',
					stored: conferenceData.documentLayouts
				}),
				corporate: conferenceData.qrCorporateDesign
			});
		} catch (error) {
			logger.error('Error generating PDF', error);
			toast.error(m.certificateDownloadError());
		}
	};
</script>

<CollapsibleRow icon="certificate" title={m.certificate()}>
	{#snippet actions()}
		<button class="btn btn-sm" onclick={downloadCertificate}>
			<i aria-hidden="true" class="ph-duotone ph-download-simple"></i>
			{m.downloadCertificate()}
		</button>
	{/snippet}
</CollapsibleRow>
