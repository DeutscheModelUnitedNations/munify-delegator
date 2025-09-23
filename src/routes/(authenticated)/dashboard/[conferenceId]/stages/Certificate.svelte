<script lang="ts">
	import { graphql } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import { certificateQuery } from '$lib/queries/certificateQuery';
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import { downloadCompleteCertificate } from '$lib/services/pdfGenerator';
	import toast from 'svelte-french-toast';

	interface Props {
		conferenceId: string | undefined;
		userId: string;
		didAttend: boolean;
	}

	let { conferenceId, userId, didAttend }: Props = $props();

	let loading = $state(false);

	$effect(() => {
		if (conferenceId && userId) {
			certificateQuery.fetch({ variables: { conferenceId, userId } });
		}
	});

	const downloadPDF = async () => {
		const conference = $certificateQuery.data?.findUniqueConference;

		if (!conference?.certificateContent || !userId) {
			return;
		}

		if (
			!$certificateQuery.data?.getCertificateJWT?.fullName ||
			!$certificateQuery.data?.getCertificateJWT?.jwt
		) {
			toast.error(m.certificateDownloadError());
			return;
		}

		loading = true;
		await downloadCompleteCertificate(
			{
				fullName: $certificateQuery.data?.getCertificateJWT?.fullName,
				jwt: $certificateQuery.data?.getCertificateJWT?.jwt
			},
			conference.certificateContent,
			`${$certificateQuery.data?.getCertificateJWT?.fullName.replace(' ', '-')}_${conference.title.replace(' ', '-')}_certificate.pdf`
		);
	};
</script>

<section class="flex flex-col gap-2 md:p-8">
	<h2 class="text-2xl font-bold">{m.thanksForParticipating()}</h2>
	<p>{m.thanksForParticipatingDescription()}</p>
	<h3 class="mt-6 text-xl font-bold">{m.certificate()}</h3>
	{#if !$certificateQuery.fetching && $certificateQuery.variables}
		{#if !$certificateQuery.data?.findUniqueConference?.certificateContent}
			<div class="alert alert-error">
				<i class="fas fa-hourglass-half"></i>
				<p>
					{m.certificateNotYetAvailable()}
				</p>
			</div>
		{:else if didAttend && userId && $certificateQuery.data?.getCertificateJWT.jwt}
			<p>{m.certificateDescription()}</p>

			<button class="btn btn-primary mt-4 w-full max-w-sm" onclick={downloadPDF}>
				<i class="fas fa-download"></i>
				{m.downloadCertificate()}
			</button>
		{:else}
			<div class="alert alert-error">
				<i class="fas fa-user-xmark"></i>
				<p>
					{m.certificateDescriptionNotAttended()}
				</p>
			</div>
		{/if}
	{:else}
		<div class="skeleton bg-base-200 h-32 w-full max-w-md"></div>
	{/if}
</section>
