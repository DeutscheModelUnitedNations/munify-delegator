<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import type { StoresValues } from '$lib/services/storeExtractorType';
	import type { PageData } from '../$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';
	import formatNames from '$lib/services/formatNames';

	let {
		data
	}: {
		data: NonNullable<PageData['conferenceQueryData']> & Pick<PageData, 'user'>;
	} = $props();

	const user = $derived(data.findUniqueSingleParticipant?.user);
</script>

<TasksWrapper>
	{#if data.findUniqueConference?.info}
		<TaskAlertCard
			faIcon="fa-info-circle"
			title={m.conferenceInfo()}
			description={m.conferenceInfoDescription()}
			btnText={m.goToConferenceInfo()}
			btnLink={`./${data.findUniqueConference?.id}/info`}
		/>
	{/if}
	{#if data.findUniqueConference?.linkToPreparationGuide}
		<TaskAlertCard
			faIcon="fa-book-bookmark"
			title={m.preparation()}
			description={m.preparationDescription()}
			btnText={m.goToPreparation()}
			btnLink={data.findUniqueConference?.linkToPreparationGuide}
			btnExternal
		/>
	{/if}
</TasksWrapper>

<section class="flex w-full flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.role()}</h2>
	<div class="stats bg-base-200 shadow">
		<RoleWidget customConferenceRole={data.findUniqueSingleParticipant?.assignedRole} />
	</div>
</section>

<section class="flex w-full flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.status()}</h2>
	<!-- <DelegationStatusTableWrapper withCommittee withMailStatus withPaymentStatus> -->
	<DelegationStatusTableWrapper>
		<DelegationStatusTableEntry
			name={formatNames(user?.given_name, user?.family_name)}
			pronouns={user?.pronouns ?? ''}
		/>
	</DelegationStatusTableWrapper>
</section>
