<script lang="ts">
	import { graphql } from '$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import formatNames, { formatInitials } from '$lib/services/formatNames';
	import { downloadCompleteCertificate } from '$lib/services/pdfGenerator';
	import { toast } from '@zerodevx/svelte-toast';

	interface Props {
		conferenceId: string;
		userId: string;
		didAttend: boolean;
	}

	let { conferenceId, userId, didAttend }: Props = $props();

	let loading = $state(false);

	const certificateQuery = graphql(`
		query CertificateQuery($conferenceId: String!, $userId: String!) @load {
			findUniqueConference(where: { id: $conferenceId }) {
				certificateContent
				title
			}
			getCertificateJWT(
				where: { conferenceId: { equals: $conferenceId }, userId: { equals: $userId } }
			) {
				jwt
				fullName
			}
		}
	`);

	$effect(() => {
		certificateQuery.fetch({ variables: { conferenceId, userId } });
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
			toast.push(m.certificateDownloadError(), {
				duration: 5000
			});
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

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.thanksForParticipating()}</h2>
	<p>{m.thanksForParticipatingDescription()}</p>
	<h3 class="mt-6 text-xl font-bold">{m.certificate()}</h3>
	{#if !$certificateQuery.fetching}
		{#if !$certificateQuery.data?.findUniqueConference?.certificateContent}
			<div class="alert alert-error">
				<i class="fas fa-hourglass-half"></i>
				<p>
					{m.certificateNotYetAvailable()}
				</p>
			</div>
		{:else if didAttend && $certificateQuery.data?.findUniqueUser?.id}
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
		<div class="skeleton h-32 w-full max-w-md bg-base-200"></div>
	{/if}
</section>
