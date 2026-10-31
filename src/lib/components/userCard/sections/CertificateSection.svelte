<script lang="ts">
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { toast } from 'svelte-sonner';
	import { downloadCompleteCertificate } from '#lib/utils/pdfGenerator';
	import { resolveDocumentLayout } from '#lib/helpers/documentLayout';
	import { certificateContentsOf, documentFileName } from '../tabs/statusDownloads';

	/** The person's participation certificate, generated when it is asked for. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const downloadCertificate = async () => {
		try {
			const [conferenceData, jwtData, user] = await Promise.all([
				client.query.conference({
					__args: { id: conferenceId },
					certificateFile: { url: true },
					documentLayouts: true,
					title: true
				}),
				client.query.getCertificateJWT({
					__args: { conferenceId, userId },
					jwt: true,
					fullName: true,
					sessions: true
				}),
				client.query.user({ __args: { id: userId }, id: true, givenName: true, familyName: true })
			]);
			const certificate = certificateContentsOf(jwtData);
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
				})
			});
		} catch (error) {
			logger.error('Error generating PDF', error);
			toast.error(m.certificateDownloadError());
		}
	};
</script>

<section class="flex flex-col gap-3">
	<h3 class="text-lg font-bold">{m.certificate()}</h3>
	<div class="bg-base-200 rounded-box flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
		<i class="fa-sharp-duotone fa-solid fa-certificate text-base-content/60 w-6 text-center text-lg"
		></i>
		<span class="grow font-semibold">{m.certificate()}</span>
		<button class="btn btn-sm" onclick={downloadCertificate}>
			<i class="fa-sharp-duotone fa-solid fa-download"></i>
			{m.downloadCertificate()}
		</button>
	</div>
</section>
