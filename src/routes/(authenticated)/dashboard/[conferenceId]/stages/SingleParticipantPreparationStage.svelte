<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import type { PageData } from '../$houdini';
	import * as m from '$lib/paraglide/messages.js';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';
	import formatNames from '$lib/services/formatNames';
	import generatePaperInboxLinkWithParams from '$lib/services/paperInboxLink';

	let {
		data
	}: {
		data: NonNullable<PageData['conferenceQueryData']> & Pick<PageData, 'user'>;
	} = $props();

	const user = $derived(data.findUniqueSingleParticipant?.user);
</script>

<TasksWrapper>
	{#if data.findManySurveyQuestions && data.findManySurveyQuestions.length > 0}
		<TaskAlertCard
			faIcon="fa-square-poll-horizontal"
			title={m.survey()}
			description={m.surveyDescription()}
			btnText={m.goToSurvey()}
			btnLink={`./${data.findUniqueConference?.id}/survey`}
			severity={data.findManySurveyQuestions.length > data.findManySurveyAnswers.length
				? 'warning'
				: 'info'}
		/>
	{/if}
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
	{#if data.findUniqueConference?.linkToPaperInbox && data.user}
		<TaskAlertCard
			faIcon="fa-file-circle-plus"
			title={m.paperInbox()}
			description={m.paperInboxDescription()}
			btnText={m.paperInboxBtn()}
			btnLink={generatePaperInboxLinkWithParams(
				data.findUniqueConference?.linkToPaperInbox,
				data.user
			)}
			btnExternal
			severity="info"
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
