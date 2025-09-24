<script lang="ts">
	import type { PageData } from './$houdini';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import ConferenceStatusWidget from './ConferenceStatusWidget.svelte';
	import ApplicationRejected from '$lib/components/ApplicationRejected.svelte';
	import SingleParticipantRegistrationStage from './stages/SingleParticipant/SingleParticipantRegistrationStage.svelte';
	import SingleParticipantPreparationStage from './stages/SingleParticipant/SingleParticipantPreparationStage.svelte';
	import Certificate from './stages/Common/Certificate.svelte';
	import DelegationRegistrationStage from './stages/Delegation/DelegationRegistrationStage.svelte';
	import DelegationPreparationStage from './stages/Delegation/DelegationPreparationStage.svelte';
	import Supervisor from './stages/Supervisor/Supervisor.svelte';

	// the app needs some proper loading states!
	//TODO https://houdinigraphql.com/guides/loading-states

	let { data }: { data: PageData } = $props();
	let conferenceQueryData = $derived(data.conferenceQueryData);
	let conference = $derived(conferenceQueryData?.findUniqueConference);
	let delegationMember = $derived(conferenceQueryData?.findUniqueDelegationMember);
	let singleParticipant = $derived(conferenceQueryData?.findUniqueSingleParticipant);
	let supervisor = $derived(conferenceQueryData?.findUniqueConferenceSupervisor);
	let status = $derived(conferenceQueryData?.findUniqueConferenceParticipantStatus);
	let surveyQuestions = $derived(conferenceQueryData?.findUniqueSurveyQuestions);
	let surveyAnswers = $derived(conferenceQueryData?.findUniqueSurveyAnswers);
</script>

<div class="flex w-full flex-col items-center">
	<div class="flex w-full flex-col gap-10">
		<!-- TODO add "new" badge if content of this changes -->
		{#if singleParticipant?.id}
			{#if conference!.state === 'PARTICIPANT_REGISTRATION'}
				<SingleParticipantRegistrationStage
					{singleParticipant}
					{conference}
					applicationForm={data.applicationForm}
				/>
			{:else if singleParticipant?.assignedRole}
				{#if conference!.state === 'PREPARATION' || conference!.state === 'ACTIVE'}
					<ConferenceStatusWidget
						conferenceId={conference!.id}
						userId={data.user.sub}
						{status}
						ofAgeAtConference={data.ofAgeAtConference}
						unlockPayment={conference?.unlockPayments}
						unlockPostals={conference?.unlockPostals}
					/>
					<SingleParticipantPreparationStage
						{conference}
						{singleParticipant}
						{surveyAnswers}
						{surveyQuestions}
						user={data.user}
					/>
				{:else if conference!.state === 'POST'}
					<Certificate
						conferenceId={conference!.id}
						userId={data.user.sub}
						didAttend={!!data.conferenceQueryData?.findUniqueConferenceParticipantStatus?.didAttend}
					/>
				{/if}
			{:else}
				<ApplicationRejected />
			{/if}
		{:else if delegationMember?.id}
			{#if conference!.state === 'PARTICIPANT_REGISTRATION'}
				<DelegationRegistrationStage
					{delegationMember}
					{conference}
					applicationForm={data.applicationForm}
				/>
			{:else if !!delegationMember?.delegation?.assignedNation || !!delegationMember?.delegation?.assignedNonStateActor}
				{#if conference!.state === 'PREPARATION' || conference!.state === 'ACTIVE'}
					<ConferenceStatusWidget
						conferenceId={conference!.id}
						userId={data.user.sub}
						ofAgeAtConference={data.ofAgeAtConference}
						{status}
						unlockPayment={conference?.unlockPayments}
						unlockPostals={conference?.unlockPostals}
					/>
					<DelegationPreparationStage
						{delegationMember}
						{conference}
						{surveyAnswers}
						{surveyQuestions}
						user={data.user}
					/>
				{:else if conference!.state === 'POST'}
					<Certificate
						conferenceId={conference!.id}
						userId={data.user.sub}
						didAttend={!!status?.didAttend}
					/>
				{/if}
			{:else}
				<ApplicationRejected />
			{/if}
		{:else if supervisor}
			{@const everybodyGotRejected =
				conference!.state !== 'PARTICIPANT_REGISTRATION' &&
				(supervisor.supervisedDelegationMembers
					.flatMap((x) => x.delegation)
					.filter((x) => !!x.assignedNation || !!x.assignedNonStateActor).length > 0 ||
					supervisor.supervisedSingleParticipants.filter((x) => x.assignedRole).length > 0)}
			{#if everybodyGotRejected || conference!.state === 'PARTICIPANT_REGISTRATION'}
				{#if conference!.state === 'POST'}
					<Certificate
						conferenceId={conference!.id}
						userId={data.user.sub}
						didAttend={!!status?.didAttend}
					/>
				{:else}
					<Supervisor
						user={data.user}
						{conference}
						{supervisor}
						{status}
						ofAge={data.ofAgeAtConference}
					/>
				{/if}
			{:else}
				<ApplicationRejected />
			{/if}
		{:else}
			<NoConferenceIndicator />
		{/if}
	</div>
</div>
