<script lang="ts">
	import StudentsAcceptedStat from './StudentsAcceptedStat.svelte';
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { downloadCompleteCertificate } from '$lib/utils/pdfGenerator';
	import { toast } from 'svelte-sonner';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import ResolutionDownloads from './ResolutionDownloads.svelte';
	import RoleWidget from '$lib/components/delegationStats/RoleWidget.svelte';
	import type { ComponentProps } from 'svelte';
	import { planCertificateDownload, type CertificateData } from './certificateDownload';

	type Role = ComponentProps<typeof RoleWidget>;

	interface Props {
		conferenceId: string | undefined;
		userId: string;
		didAttend: boolean;
		// Role data for delegates
		country?: Role['country'];
		assignedCommittee?: { name: string } | null;
		nonStateActor?: Role['nonStateActor'];
		// Role data for single participants
		customConferenceRole?: Role['customConferenceRole'];
		// Supervisor data
		isSupervisor?: boolean;
		acceptedStudentsCount?: number;
		totalStudentsCount?: number;
	}

	let {
		conferenceId,
		userId,
		didAttend,
		country,
		assignedCommittee,
		nonStateActor,
		customConferenceRole,
		isSupervisor = false,
		acceptedStudentsCount = 0,
		totalStudentsCount = 0
	}: Props = $props();

	// Wrap single committee in array for RoleWidget, adding numOfSeatsPerDelegation=1 to hide "(Nx)" suffix
	const committees = $derived(
		assignedCommittee ? [{ name: assignedCommittee.name, numOfSeatsPerDelegation: 1 }] : undefined
	);

	const hasRole = $derived(!!country || !!nonStateActor || !!customConferenceRole);

	let certificate = $state<CertificateData>();

	$effect(() => {
		if (!conferenceId || !userId) return;
		const requestedFor = { conferenceId, userId };
		let cancelled = false;

		void Promise.all([
			client.query.conference({
				__args: { id: requestedFor.conferenceId },
				certificateContentUrl: true,
				title: true
			}),
			client.query.getCertificateJWT({
				__args: requestedFor,
				jwt: true,
				fullName: true
			})
		]).then(([conference, jwt]) => {
			if (cancelled) return;
			certificate = { ...conference, ...jwt };
		});

		return () => {
			cancelled = true;
		};
	});

	const downloadPDF = async () => {
		const download = planCertificateDownload(certificate, userId);
		if (download.kind === 'incomplete') {
			toast.error(m.certificateDownloadError());
		}
		if (download.kind !== 'ready') return;

		await downloadCompleteCertificate(download.holder, download.content, download.filename);
	};
</script>

<DashboardSection
	icon="party-horn"
	title={m.thanksForParticipating()}
	description={m.thanksForParticipatingDescription()}
>
	<div class="flex flex-col items-center justify-center py-4">
		<i class="fa-duotone fa-hands-clapping text-6xl text-primary mb-4"></i>
		<p class="text-center text-base-content/70">{m.conferenceCompleteMessage()}</p>
	</div>
</DashboardSection>

{#if hasRole}
	<DashboardSection
		icon="masks-theater"
		title={m.yourRole()}
		description={m.yourRolePostDescription()}
	>
		<div class="stats bg-base-200 shadow">
			<RoleWidget {country} {committees} {nonStateActor} {customConferenceRole} />
		</div>
	</DashboardSection>
{/if}

{#if isSupervisor && totalStudentsCount > 0}
	<DashboardSection
		icon="users"
		title={m.yourStudents()}
		description={m.yourStudentsPostDescription()}
	>
		<StudentsAcceptedStat accepted={acceptedStudentsCount} total={totalStudentsCount} />
	</DashboardSection>
{/if}

<DashboardSection
	icon="certificate"
	title={m.certificate()}
	description={m.certificateDescription()}
>
	{#if certificate}
		{#if !certificate.certificateContentUrl}
			<div class="alert alert-warning">
				<i class="fas fa-hourglass-half"></i>
				<p>{m.certificateNotYetAvailable()}</p>
			</div>
		{:else if didAttend && userId && certificate.jwt}
			<button class="btn btn-primary self-start" onclick={downloadPDF}>
				<i class="fas fa-download"></i>
				{m.downloadCertificate()}
			</button>
		{:else}
			<div class="alert alert-error">
				<i class="fas fa-user-xmark"></i>
				<p>{m.certificateDescriptionNotAttended()}</p>
			</div>
		{/if}
	{:else}
		<div class="skeleton bg-base-200 h-16 w-full max-w-sm"></div>
	{/if}
</DashboardSection>

{#if conferenceId}
	<ResolutionDownloads {conferenceId} />
{/if}
