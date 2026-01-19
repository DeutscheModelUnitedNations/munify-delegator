<script lang="ts">
	import type { PageData } from './$houdini';
	import NSAs from './sections/NSAs.svelte';
	import SingleParticipants from './sections/SingleParticipants.svelte';
	import Supervisors from './sections/Supervisors.svelte';
	import Delegations from './sections/Delegations.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { graphql, type LookupUserToAssignQuery$result } from '$houdini';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/services/formatNames';
	import { genericPromiseToastMessages } from '$lib/services/toast';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();
	let conferenceId = $derived(data.conferenceId);

	const params = queryParameters({
		assignUserId: true
	});
	let assignUser = $state<NonNullable<LookupUserToAssignQuery$result['findUniqueUser']>>();

	let seatsQuery = $derived(data.SeatsQuery);
	let committees = $derived($seatsQuery.data?.findManyCommittees ?? []);
	let nations = $derived($seatsQuery.data?.findManyNations ?? []);
	let roles = $derived($seatsQuery.data?.findManyCustomConferenceRoles ?? []);
	let delegations = $derived($seatsQuery.data?.findManyDelegations ?? []);
	let nonStateActors = $derived($seatsQuery.data?.findManyNonStateActors ?? []);
	let singleParticipants = $derived($seatsQuery.data?.findManySingleParticipants ?? []);
	let supervisors = $derived($seatsQuery.data?.findManyConferenceSupervisors ?? []);

	const LookupUserToAssignQuery = graphql(`
		query LookupUserToAssignQuery($id: String!) {
			findUniqueUser(where: { id: $id }) {
				id
				family_name
				given_name
			}
		}
	`);

	$effect(() => {
		if ($params.assignUserId) {
			toast
				.promise(
					LookupUserToAssignQuery.fetch({ variables: { id: $params.assignUserId } }),
					genericPromiseToastMessages
				)
				.then((res) => (assignUser = res.data?.findUniqueUser));
		} else {
			assignUser = undefined;
		}
	});
</script>

<div class="flex w-full flex-col items-start gap-10 p-4">
	{#if $params.assignUserId}
		<div class="w-full">
			<div class="alert alert-warning w-full">
				{#if $LookupUserToAssignQuery.fetching}
					<i class="fa-solid fa-spinner fa-spin"></i>
				{:else if assignUser}
					<i class="fa-solid fa-user-plus fa-beat-fade"></i>
					<div>
						{m.assigningUser()}
						<span class="font-bold">
							{formatNames(assignUser.given_name, assignUser.family_name)}
						</span>
						({assignUser.id})
					</div>
				{:else}
					<i class="fa-solid fa-user-xmark fa-shake"></i>
					{m.userNotFound()}
				{/if}
			</div>
		</div>
	{/if}

	<Delegations {delegations} {committees} {nations} {conferenceId} />
	<NSAs {nonStateActors} {delegations} {conferenceId} />
	<SingleParticipants {singleParticipants} {roles} {conferenceId} />
	<Supervisors {supervisors} {conferenceId} />
</div>
