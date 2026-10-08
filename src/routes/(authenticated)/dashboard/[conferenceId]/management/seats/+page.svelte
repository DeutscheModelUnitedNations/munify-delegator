<script lang="ts">
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
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	let conferenceId = $derived(routeParams.conferenceId);

	const params = queryParameters({
		assignUserId: true
	});
	function lookupUser(id: string) {
		return client.query.user({ __args: { id }, id: true, familyName: true, givenName: true });
	}

	let assignUser = $state<Awaited<ReturnType<typeof lookupUser>>>();
	let assignUserLoading = $state(false);

	$effect(() => {
		if (!params.assignUserId) {
			assignUser = undefined;
			return;
		}
		assignUserLoading = true;
		const promise = lookupUser(params.assignUserId);
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
	{#if params.assignUserId}
		<div class="w-full">
			<div class="alert alert-warning w-full">
				{#if assignUserLoading}
					<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin"></i>
				{:else if assignUser}
					<i class="fa-sharp-duotone fa-solid fa-user-plus fa-beat-fade"></i>
					<div>
						{m.assigningUser()}
						<span class="font-bold">
							{formatNames(assignUser.givenName ?? undefined, assignUser.familyName ?? undefined)}
						</span>
						({assignUser.id})
					</div>
				{:else}
					<i class="fa-sharp-duotone fa-solid fa-user-xmark fa-shake"></i>
					{m.userNotFound()}
				{/if}
			</div>
		</div>
	{/if}

	<Delegations {conferenceId} />
	<NSAs {conferenceId} />
	<SingleParticipants {conferenceId} />
	<Supervisors {conferenceId} />
</div>
