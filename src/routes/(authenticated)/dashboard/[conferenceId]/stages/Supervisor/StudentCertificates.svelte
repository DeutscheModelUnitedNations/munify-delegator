<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';
	import StudentCertificateRow from './StudentCertificateRow.svelte';
	import { studentCertificateRows } from './studentCertificates';

	/** The certificates of the students who got a role, for their supervisor to hand out. */
	interface Props {
		conferenceId: string;
		supervisorId: string;
	}

	let { conferenceId, supervisorId }: Props = $props();

	const [conference, supervisor] = $derived(
		await Promise.all([
			client.liveQuery.conference({ __args: { id: conferenceId }, certificateFile: { url: true } }),
			client.liveQuery.conferenceSupervisor({
				__args: { id: supervisorId },
				supervisedDelegationMembers: {
					user: {
						givenName: true,
						familyName: true,
						conferenceParticipants: { didAttend: true, conference: { id: true } }
					},
					delegation: { assignedRole: { id: true } }
				},
				supervisedSingleParticipants: {
					user: {
						givenName: true,
						familyName: true,
						conferenceParticipants: { didAttend: true, conference: { id: true } }
					},
					assignedRole: { id: true }
				}
			})
		])
	);

	const rows = $derived(
		studentCertificateRows({
			conferenceId,
			students: [
				...supervisor.supervisedDelegationMembers.filter((x) => x.delegation.assignedRole),
				...supervisor.supervisedSingleParticipants.filter((x) => x.assignedRole)
			]
		})
	);
</script>

<DashboardSection
	icon="certificate"
	title={m.studentCertificates()}
	description={m.studentCertificatesDescription()}
>
	{#if !conference.certificateFile}
		<div class="alert alert-warning">
			<i aria-hidden="true" class="ph-fill ph-hourglass-medium"></i>
			<p>{m.certificateNotYetAvailable()}</p>
		</div>
	{:else if rows.length === 0}
		<p class="text-base-content/70">{m.studentCertificatesEmpty()}</p>
	{:else}
		<ul class="bg-base-200 rounded-box divide-base-300 divide-y">
			{#each rows as row (row.userId)}
				<StudentCertificateRow {conferenceId} {row} />
			{/each}
		</ul>
	{/if}
</DashboardSection>
