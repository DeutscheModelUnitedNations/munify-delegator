<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import Fact from '../Fact.svelte';
	import PersonNameButton from '../PersonNameButton.svelte';
	import { fetchSupervisors } from '../sections/supervisorsOf';
	import { uniqueSupervisorsByFamilyName } from '../tabs/supervisorList';

	/** Who supervises the person, each opening their own card. */
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
</script>

<Fact label={m.supervisors()}>
	{#if supervisors.length === 0}
		<span class="text-base-content/60 italic">{m.userCardNoSupervisors()}</span>
	{:else}
		<ul class="flex flex-col">
			{#each supervisors as supervisor (supervisor.id)}
				<li><PersonNameButton user={supervisor.user} /></li>
			{/each}
		</ul>
	{/if}
</Fact>
