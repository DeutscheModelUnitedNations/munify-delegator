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
	import { m } from '$lib/paraglide/messages';
	import { translateTeamRole } from '$lib/services/enumTranslations';

	// the app needs some proper loading states!
	//TODO https://houdinigraphql.com/guides/loading-states

	let { data }: { data: PageData } = $props();
	let conferenceQueryData = $derived(data.conferenceQueryData);
	let conference = $derived(conferenceQueryData?.findUniqueConference);
	let delegationMember = $derived(conferenceQueryData?.findUniqueDelegationMember);
	let singleParticipant = $derived(conferenceQueryData?.findUniqueSingleParticipant);
	let supervisor = $derived(conferenceQueryData?.findUniqueConferenceSupervisor);
	let teamMember = $derived(conferenceQueryData?.findUniqueTeamMember);
	let status = $derived(conferenceQueryData?.findUniqueConferenceParticipantStatus);
	let surveyQuestions = $derived(conferenceQueryData?.findManySurveyQuestions);
	let surveyAnswers = $derived(conferenceQueryData?.findManySurveyAnswers);
</script>

<div class="flex w-full flex-col items-center">
	<div class="flex w-full flex-col gap-10">
		{#if conference?.id}
			<div class="flex justify-end">
				<a href={`/dashboard/${conference.id}/messaging`} class="btn btn-outline">
					<i class="fa-solid fa-envelope"></i>
					Messaging
				</a>
			</div>
		{/if}
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

					<div class="mt-4">
						<a href={'/dashboard/' + conference?.id + '/messaging'} class="btn btn-outline">
							<i class="fa-solid fa-envelope"></i>
							Messaging
						</a>
					</div>
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
				<ApplicationRejected conferenceIdForWaitingListLink={conference.id} />
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

					<div class="mt-4">
						<a href={'/dashboard/' + conference?.id + '/messaging'} class="btn btn-outline">
							<i class="fa-solid fa-envelope"></i>
							messaging
						</a>
					</div>
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
				<ApplicationRejected conferenceIdForWaitingListLink={conference.id} />
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
		{:else if teamMember}
			<div class="card bg-base-200 w-full p-6">
				<div class="flex flex-col gap-6">
					<div class="flex items-center gap-4">
						<div class="bg-primary text-primary-content rounded-box p-4">
							<i class="fa-solid fa-users-gear text-3xl"></i>
						</div>
						<div>
							<h1 class="text-2xl font-bold">{m.teamMemberDashboard()}</h1>
							<p class="text-base-content/70">
								{conference?.title} &bull; {translateTeamRole(teamMember.role)}
							</p>
						</div>
					</div>

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#if teamMember.role === 'REVIEWER' || teamMember.role === 'PROJECT_MANAGEMENT'}
							<a
								href="/dashboard/{conference?.id}/paperhub"
								class="card bg-base-100 hover:bg-base-300 transition-colors"
							>
								<div class="card-body">
									<div class="flex items-center gap-3">
										<i class="fa-duotone fa-files text-2xl text-primary"></i>
										<h2 class="card-title">{m.paperHub()}</h2>
									</div>
									<p class="text-base-content/70">{m.reviewPapers()}</p>
								</div>
							</a>
						{/if}
						{#if teamMember.role === 'PARTICIPANT_CARE' || teamMember.role === 'PROJECT_MANAGEMENT'}
							<a
								href="/management/{conference?.id}"
								class="card bg-base-100 hover:bg-base-300 transition-colors"
							>
								<div class="card-body">
									<div class="flex items-center gap-3">
										<i class="fa-duotone fa-bars-progress text-2xl text-primary"></i>
										<h2 class="card-title">{m.administration()}</h2>
									</div>
									<p class="text-base-content/70">{m.manageConference()}</p>
								</div>
							</a>
						{/if}
					</div>
				</div>
			</div>
		{:else}
			<NoConferenceIndicator />
		{/if}
	</div>
</div>
