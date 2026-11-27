<script lang="ts">
	import StudentsAcceptedStat from './StudentsAcceptedStat.svelte';
	import { m } from '#lib/paraglide/messages';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import ResolutionDownloads from './ResolutionDownloads.svelte';
	import StudentCertificates from '../Supervisor/StudentCertificates.svelte';
	import OwnCertificate from './OwnCertificate.svelte';
	import RoleWidget from '#lib/components/delegationStats/RoleWidget.svelte';
	import type { ComponentProps } from 'svelte';

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
		/** For a supervisor: who gets their students' certificates instead of one of their own. */
		supervisorId?: string;
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
		supervisorId,
		acceptedStudentsCount = 0,
		totalStudentsCount = 0
	}: Props = $props();

	// Wrap single committee in array for RoleWidget, adding numOfSeatsPerDelegation=1 to hide "(Nx)" suffix
	const committees = $derived(
		assignedCommittee ? [{ name: assignedCommittee.name, numOfSeatsPerDelegation: 1 }] : undefined
	);

	const hasRole = $derived(!!country || !!nonStateActor || !!customConferenceRole);
</script>

<DashboardSection
	icon="confetti"
	title={m.thanksForParticipating()}
	description={m.thanksForParticipatingDescription()}
>
	<div class="flex flex-col items-center justify-center py-4">
		<i aria-hidden="true" class="ph-duotone ph-hands-clapping text-6xl text-primary mb-4"></i>
		<p class="text-center text-base-content/70">{m.conferenceCompleteMessage()}</p>
	</div>
</DashboardSection>

{#if hasRole}
	<DashboardSection
		icon="mask-happy"
		title={m.yourRole()}
		description={m.yourRolePostDescription()}
	>
		<div class="stats bg-base-200 shadow">
			<RoleWidget {country} {committees} {nonStateActor} {customConferenceRole} />
		</div>
	</DashboardSection>
{/if}

{#if supervisorId && totalStudentsCount > 0}
	<DashboardSection
		icon="users"
		title={m.yourStudents()}
		description={m.yourStudentsPostDescription()}
	>
		<StudentsAcceptedStat accepted={acceptedStudentsCount} total={totalStudentsCount} />
	</DashboardSection>
{/if}

{#if conferenceId && supervisorId}
	<StudentCertificates {conferenceId} {supervisorId} />
{:else}
	<OwnCertificate {conferenceId} {userId} {didAttend} />
{/if}

{#if conferenceId}
	<ResolutionDownloads {conferenceId} />
{/if}
