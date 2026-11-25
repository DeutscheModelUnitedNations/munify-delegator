<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import AssignSupervisorModal from '../AssignSupervisorModal.svelte';
	import Fact from '../Fact.svelte';
	import PersonNameButton from '../PersonNameButton.svelte';
	import { removeSupervision } from '../sections/removeSupervision';
	import { fetchSupervisors } from '../sections/supervisorsOf';
	import { uniqueSupervisorsByFamilyName } from '../tabs/supervisorList';

	/** Who supervises the person, each opening their own card. Added and removed here. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const registrations = $derived(await fetchSupervisors({ userId, conferenceId }));
	const supervisors = $derived(
		uniqueSupervisorsByFamilyName(
			registrations.delegationMembers.at(0)?.supervisors,
			registrations.singleParticipants.at(0)?.supervisors
		)
	);

	let assigning = $state(false);
</script>

<Fact label={m.supervisors()} icon="chalkboard-teacher" class="col-span-2">
	{#if supervisors.length === 0}
		<span class="text-base-content/60">{m.userCardNoSupervisors()}</span>
	{:else}
		<ul class="flex flex-col gap-1" aria-label={m.supervisors()}>
			{#each supervisors as supervisor (supervisor.id)}
				<li class="group flex items-center justify-between gap-2">
					<PersonNameButton user={supervisor.user} />
					<button
						class="btn btn-ghost btn-xs btn-square hover:text-error -my-1 text-base opacity-40 group-hover:opacity-100 focus-visible:opacity-100"
						onclick={() => removeSupervision({ supervisor, student: registrations.student })}
						aria-label={m.removeSupervision()}
						title={m.removeSupervision()}
					>
						<i aria-hidden="true" class="ph-duotone ph-link-break"></i>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<button class="btn btn-ghost btn-xs text-primary mt-1 -ml-2" onclick={() => (assigning = true)}>
		<i aria-hidden="true" class="ph-duotone ph-user-plus text-base"></i>
		{m.assignSupervisor()}
	</button>
	<AssignSupervisorModal bind:open={assigning} {userId} {conferenceId} />
</Fact>
