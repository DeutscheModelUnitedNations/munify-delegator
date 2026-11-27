<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { downloadCompleteCertificate } from '#lib/utils/pdfGenerator';
	import { toast } from 'svelte-sonner';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import { planCertificateDownload, type CertificateData } from './certificateDownload';
	import { resolveDocumentLayout } from '#lib/helpers/documentLayout';

	/** The participant's own certificate after the conference, once they attended. */
	interface Props {
		conferenceId: string | undefined;
		userId: string;
		didAttend: boolean;
	}

	let { conferenceId, userId, didAttend }: Props = $props();

	/**
	 * The template is read live: the dashboard has the conference cached already, so the first answer
	 * lacks the template until the network's arrives, and a one-shot read would keep that first one.
	 */
	async function fetchCertificate({
		conferenceId,
		userId
	}: {
		conferenceId: string;
		userId: string;
	}) {
		return Promise.all([
			client.liveQuery.conference({
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
			})
		]);
	}

	const sources = $derived(
		conferenceId && userId ? await fetchCertificate({ conferenceId, userId }) : undefined
	);
	const certificate = $derived.by((): CertificateData | undefined => {
		if (!sources) return undefined;
		const [conference, signed] = sources;
		return {
			templateUrl: conference.certificateFile?.url ?? null,
			title: conference.title,
			code: signed.code,
			fullName: signed.fullName,
			sessions: signed.sessions
		};
	});

	const downloadPDF = async () => {
		const download = planCertificateDownload({ certificate, userId });
		if (download.kind === 'incomplete') {
			toast.error(m.certificateDownloadError());
		}
		if (download.kind !== 'ready') return;

		await downloadCompleteCertificate({
			data: download.holder,
			certificate: download.content,
			fileName: download.filename,
			layout: resolveDocumentLayout({
				document: 'certificate',
				stored: sources?.[0].documentLayouts
			}),
			corporate: sources?.[0].qrCorporateDesign ?? true
		});
	};
</script>

<DashboardSection
	icon="certificate"
	title={m.certificate()}
	description={m.certificateDescription()}
>
	{#if certificate}
		{#if !certificate.templateUrl}
			<div class="alert alert-warning">
				<i aria-hidden="true" class="ph-fill ph-hourglass-medium"></i>
				<p>{m.certificateNotYetAvailable()}</p>
			</div>
		{:else if didAttend && userId && certificate.code}
			<button class="btn btn-primary self-start" onclick={downloadPDF}>
				<i aria-hidden="true" class="ph-fill ph-download-simple"></i>
				{m.downloadCertificate()}
			</button>
		{:else}
			<div class="alert alert-error">
				<i aria-hidden="true" class="ph-fill ph-user-minus"></i>
				<p>{m.certificateDescriptionNotAttended()}</p>
			</div>
		{/if}
	{:else}
		<div class="skeleton bg-base-200 h-16 w-full max-w-sm"></div>
	{/if}
</DashboardSection>
