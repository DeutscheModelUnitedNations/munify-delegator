<script lang="ts">
	import type { PageData } from './$types';
	import { fetchConferenceSeatMap } from './conferenceSeatMap';
	import NSAs from './sections/NSAs.svelte';
	import SingleParticipants from './sections/SingleParticipants.svelte';
	import Supervisors from './sections/Supervisors.svelte';
	import Delegations from './sections/Delegations.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import { genericPromiseToastMessages } from '$lib/utils/toast';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();
	let conferenceId = $derived(data.conferenceId);

	const params = queryParameters({
		assignUserId: true
	});
	function lookupUser(id: string) {
		return client.query.user({ __args: { id }, id: true, familyName: true, givenName: true });
	}

	let assignUser = $state<Awaited<ReturnType<typeof lookupUser>>>();
	let assignUserLoading = $state(false);

	const seatMap = $derived(await fetchConferenceSeatMap(conferenceId));
	const committees = $derived(seatMap.committees);
	const nations = $derived(seatMap.nations);
	const roles = $derived(seatMap.roles);
	const delegations = $derived(seatMap.delegations);
	const nonStateActors = $derived(seatMap.nonStateActors);
	const singleParticipants = $derived(seatMap.singleParticipants);
	const supervisors = $derived(seatMap.supervisors);

	$effect(() => {
		if (!$params.assignUserId) {
			assignUser = undefined;
			return;
		}
		assignUserLoading = true;
		const promise = lookupUser($params.assignUserId);
		toast.promise(promise, genericPromiseToastMessages);
		void promise
			.then((result) => {
				assignUser = result;
			})
			.finally(() => {
				assignUserLoading = false;
			});
	});
</script>

<div class="flex w-full flex-col items-start gap-10 p-4">
	{#if $params.assignUserId}
		<div class="w-full">
			<div class="alert alert-warning w-full">
				{#if assignUserLoading}
					<i class="fa-solid fa-spinner fa-spin"></i>
				{:else if assignUser}
					<i class="fa-solid fa-user-plus fa-beat-fade"></i>
					<div>
						{m.assigningUser()}
						<span class="font-bold">
							{formatNames(assignUser.givenName ?? undefined, assignUser.familyName ?? undefined)}
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
