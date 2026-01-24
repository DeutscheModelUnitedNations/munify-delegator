<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { certificateQuery } from '$lib/queries/certificateQuery';
	import { downloadCompleteCertificate } from '$lib/services/pdfGenerator';
	import { toast } from 'svelte-sonner';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import type { MyConferenceparticipationQuery$result } from '$houdini';

	interface Props {
		conferenceId: string | undefined;
		userId: string;
		didAttend: boolean;
		// Role data for delegates
		country?: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueDelegationMember']
		>['delegation']['assignedNation'];
		assignedCommittee?: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueDelegationMember']
		>['assignedCommittee'];
		nonStateActor?: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueDelegationMember']
		>['delegation']['assignedNonStateActor'];
		// Role data for single participants
		customConferenceRole?: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueSingleParticipant']
		>['assignedRole'];
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

	const allStudentsAccepted = $derived(
		isSupervisor && totalStudentsCount > 0 && acceptedStudentsCount === totalStudentsCount
	);

	// Wrap single committee in array for RoleWidget, adding numOfSeatsPerDelegation=1 to hide "(Nx)" suffix
	const committees = $derived(
		assignedCommittee
			? [{ ...assignedCommittee, numOfSeatsPerDelegation: 1, nations: [] }]
			: undefined
	);

	const hasRole = $derived(!!country || !!nonStateActor || !!customConferenceRole);

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
		<div class="stats bg-base-200 shadow">
			<div class="stat">
				<div class="stat-figure text-primary">
					<i
						class="fa-duotone text-4xl"
						class:fa-circle-check={allStudentsAccepted}
						class:text-success={allStudentsAccepted}
						class:fa-users={!allStudentsAccepted}
					></i>
				</div>
				<div class="stat-title">{m.studentsAccepted()}</div>
				<div class="stat-value">{acceptedStudentsCount} / {totalStudentsCount}</div>
				{#if allStudentsAccepted}
					<div class="stat-desc text-success">{m.allStudentsAcceptedMessage()}</div>
				{/if}
			</div>
		</div>
	</DashboardSection>
{/if}

<DashboardSection
	icon="certificate"
	title={m.certificate()}
	description={m.certificateDescription()}
>
	{#if !$certificateQuery.fetching && $certificateQuery.variables}
		{#if !$certificateQuery.data?.findUniqueConference?.certificateContent}
			<div class="alert alert-warning">
				<i class="fas fa-hourglass-half"></i>
				<p>{m.certificateNotYetAvailable()}</p>
			</div>
		{:else if didAttend && userId && $certificateQuery.data?.getCertificateJWT.jwt}
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
