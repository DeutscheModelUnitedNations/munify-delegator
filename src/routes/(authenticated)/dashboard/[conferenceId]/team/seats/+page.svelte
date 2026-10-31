<script lang="ts">
	import NSAs from './sections/NSAs.svelte';
	import SingleParticipants from './sections/SingleParticipants.svelte';
	import Supervisors from './sections/Supervisors.svelte';
	import Delegations from './sections/Delegations.svelte';
	import { provideAssignUser } from './assignUser.svelte';
	import { provideSeatSwitch } from './seatSwitchState.svelte';
	import SeatSwitchModal from './SeatSwitchModal.svelte';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	let conferenceId = $derived(routeParams.conferenceId);

	const assignUserParam = provideAssignUser();
	const seatSwitch = provideSeatSwitch();
	function lookupUser(id: string) {
		return client.query.user({ __args: { id }, id: true, familyName: true, givenName: true });
	}

	let assignUser = $state<Awaited<ReturnType<typeof lookupUser>>>();
	let assignUserLoading = $state(false);

	$effect(() => {
		const assignUserId = assignUserParam.userId;
		if (!assignUserId) {
			assignUser = undefined;
			return;
		}
		assignUserLoading = true;
		const promise = lookupUser(assignUserId);
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

<div class="flex w-full flex-col items-start gap-10 py-4 sm:px-4">
	{#if assignUserParam.userId}
		<div class="w-full">
			<div class="alert alert-warning w-full">
				{#if assignUserLoading}
					<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin"></i>
				{:else if assignUser}
					<i class="fa-sharp-duotone fa-solid fa-user-plus fa-beat-fade"></i>
					<div>
						{m.assigningUser()}
						<span class="font-bold">
							{formatNames({
								givenName: assignUser.givenName ?? undefined,
								familyName: assignUser.familyName ?? undefined
							})}
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

	<div
		class="bg-base-100 border-base-300 rounded-box sticky top-0 z-40 flex w-full flex-wrap items-center gap-4 border p-3"
	>
		<label class="label cursor-pointer gap-2">
			<input type="checkbox" class="toggle toggle-primary" bind:checked={seatSwitch.enabled} />
			<i class="fa-sharp-duotone fa-solid fa-arrow-right-arrow-left"></i>
			<span class="font-bold">{m.seatSwitch()}</span>
		</label>
		{#if seatSwitch.enabled}
			<span class="text-sm opacity-70">
				{#if seatSwitch.selected}
					{seatSwitch.selected.name} ({seatSwitch.selected.seatLabel})
					<i class="fa-sharp-duotone fa-solid fa-arrow-right mx-1"></i>
				{/if}
				{m.seatSwitchHint()}
			</span>
		{/if}
	</div>

	<Delegations {conferenceId} />
	<NSAs {conferenceId} />
	<SingleParticipants {conferenceId} />
	<Supervisors {conferenceId} />
</div>

<SeatSwitchModal {conferenceId} />
