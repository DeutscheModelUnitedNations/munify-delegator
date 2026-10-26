<script lang="ts">
	import StudentsAcceptedStat from './StudentsAcceptedStat.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { client } from '#lib/api/rumbleClient/client.js';
	import { downloadCompleteCertificate } from '#lib/utils/pdfGenerator.js';
	import { toast } from 'svelte-sonner';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import ResolutionDownloads from './ResolutionDownloads.svelte';
	import RoleWidget from '#lib/components/delegationStats/RoleWidget.svelte';
	import type { ComponentProps } from 'svelte';
	import { planCertificateDownload, type CertificateData } from './certificateDownload';
	import { resolveDocumentLayout } from '#lib/helpers/documentLayout.js';

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

	/**
	 * The template is read live: the dashboard has the conference cached already, so the first answer
	 * lacks the template until the network's arrives, and a one-shot read would keep that first one.
	 */
	async function fetchCertificate(conferenceId: string, userId: string) {
		return Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				certificateFile: { url: true },
				documentLayouts: true,
				title: true
			}),
			client.query.getCertificateJWT({
				__args: { conferenceId, userId },
				jwt: true,
				fullName: true,
				sessions: { name: true, attended: true }
			})
		]);
	}

	const sources = $derived(
		conferenceId && userId ? await fetchCertificate(conferenceId, userId) : undefined
	);
	const certificate = $derived.by((): CertificateData | undefined => {
		if (!sources) return undefined;
		const [conference, jwt] = sources;
		return {
			templateUrl: conference.certificateFile?.url ?? null,
			title: conference.title,
			jwt: jwt.jwt,
			fullName: jwt.fullName,
			sessions: jwt.sessions.map((session) => ({ name: session.name, attended: session.attended }))
		};
	});

	const downloadPDF = async () => {
		const download = planCertificateDownload(certificate, userId);
		if (download.kind === 'incomplete') {
			toast.error(m.certificateDownloadError());
		}
		if (download.kind !== 'ready') return;

		await downloadCompleteCertificate(
			download.holder,
			download.content,
			download.filename,
			resolveDocumentLayout('certificate', sources?.[0].documentLayouts)
		);
	};
</script>

<DashboardSection
	icon="party-horn"
	title={m.thanksForParticipating()}
	description={m.thanksForParticipatingDescription()}
>
	<div class="flex flex-col items-center justify-center py-4">
		<i class="fa-sharp-duotone fa-solid fa-hands-clapping text-6xl text-primary mb-4"></i>
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
		{#if !certificate.templateUrl}
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
