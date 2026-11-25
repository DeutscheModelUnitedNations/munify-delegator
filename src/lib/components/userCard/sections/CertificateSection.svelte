<script lang="ts">
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { downloadCompleteCertificate } from '#lib/utils/pdfGenerator';
	import { resolveDocumentLayout } from '#lib/helpers/documentLayout';
	import Row from '../ui/Row.svelte';
	import { fetchParticipantStatus } from '../tabs/participantStatus';
	import { certificateContentsOf, documentFileName } from '../tabs/statusDownloads';

	/** The person's participation certificate as a list row, generated when it is asked for. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	// The API issues one only to who took part
	const statuses = $derived(await fetchParticipantStatus({ userId, conferenceId }));
	const didAttend = $derived(statuses.at(0)?.didAttend ?? false);

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

{#snippet needsParticipation()}
	<span class="text-base-content/60">{m.userCardCertificateNeedsParticipation()}</span>
{/snippet}

<Row
	icon="certificate"
	title={m.certificate()}
	children={didAttend ? undefined : needsParticipation}
>
	{#snippet actions()}
		<button
			class="btn btn-sm btn-ghost text-primary disabled:text-base-content/40"
			disabled={!didAttend}
			onclick={downloadCertificate}
		>
			<i aria-hidden="true" class="ph-duotone ph-download-simple"></i>
			{m.download()}
		</button>
	{/snippet}
</Row>
