<script lang="ts">
	import type { PageData } from '../$houdini';
	import { m } from '$lib/paraglide/messages';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';
	import generatePaperInboxLinkWithParams from '$lib/services/paperInboxLink';
	import type { MyConferenceparticipationQuery$result } from '$houdini';
	import SupervisorTable from './SupervisorTable.svelte';

	interface Props {
		surveyQuestions: NonNullable<MyConferenceparticipationQuery$result['findManySurveyQuestions']>;
		surveyAnswers: NonNullable<MyConferenceparticipationQuery$result['findManySurveyAnswers']>;
		conference: NonNullable<MyConferenceparticipationQuery$result['findUniqueConference']>;
		singleParticipant: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueSingleParticipant']
		>;
		user: PageData['user'];
	}

	let { surveyQuestions, surveyAnswers, conference, singleParticipant, user }: Props = $props();
</script>

<TasksWrapper>
	{#if surveyQuestions && surveyQuestions.length > 0}
		<TaskAlertCard
			faIcon="fa-square-poll-horizontal"
			title={m.survey()}
			description={m.surveyDescription()}
			btnText={m.goToSurvey()}
			btnLink={`./${conference?.id}/survey`}
			severity={surveyQuestions.length > surveyAnswers.length ? 'warning' : 'info'}
		/>
	{/if}
	{#if conference?.info}
		<TaskAlertCard
			faIcon="fa-info-circle"
			title={m.conferenceInfo()}
			description={m.conferenceInfoDescription()}
			btnText={m.goToConferenceInfo()}
			btnLink={`./${conference?.id}/info`}
		/>
	{/if}
	{#if conference?.linkToPreparationGuide}
		<TaskAlertCard
			faIcon="fa-book-bookmark"
			title={m.preparation()}
			description={m.preparationDescription()}
			btnText={m.goToPreparation()}
			btnLink={conference?.linkToPreparationGuide}
			btnExternal
		/>
	{/if}
	{#if conference?.linkToPaperInbox && user}
		<TaskAlertCard
			faIcon="fa-file-circle-plus"
			title={m.paperInbox()}
			description={m.paperInboxDescription()}
			btnText={m.paperInboxBtn()}
			btnLink={generatePaperInboxLinkWithParams(conference?.linkToPaperInbox, user)}
			btnExternal
			severity="info"
		/>
	{/if}
</TasksWrapper>

<section class="flex w-full flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.role()}</h2>
	<div class="stats bg-base-200 shadow">
		<RoleWidget customConferenceRole={singleParticipant?.assignedRole} />
	</div>
	<SupervisorTable supervisors={singleParticipant.supervisors} conferenceId={conference.id} />
</section>
