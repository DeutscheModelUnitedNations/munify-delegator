<script lang="ts">
	import type { PageData } from './$houdini';
	import NSAs from './sections/NSAs.svelte';
	import SingleParticipants from './sections/SingleParticipants.svelte';
	import Supervisors from './sections/Supervisors.svelte';
	import Delegations from './sections/Delegations.svelte';

	let { data }: { data: PageData } = $props();
	let conferenceId = $derived(data.conferenceId);

	let seatsQuery = $derived(data.SeatsQuery);
	let committees = $derived($seatsQuery.data?.findManyCommittees ?? []);
	let nations = $derived($seatsQuery.data?.findManyNations ?? []);
	let roles = $derived($seatsQuery.data?.findManyCustomConferenceRoles ?? []);
	let delegations = $derived($seatsQuery.data?.findManyDelegations ?? []);
	let nonStateActors = $derived($seatsQuery.data?.findManyNonStateActors ?? []);
	let singleParticipants = $derived($seatsQuery.data?.findManySingleParticipants ?? []);
	let supervisors = $derived($seatsQuery.data?.findManyConferenceSupervisors ?? []);
</script>

<div class="flex w-full flex-col items-start gap-10 p-4">
	<Delegations {delegations} {committees} {nations} {conferenceId} />
	<NSAs {nonStateActors} {delegations} {conferenceId} />
	<SingleParticipants {singleParticipants} {roles} {conferenceId} />
	<Supervisors {supervisors} {conferenceId} />
</div>
