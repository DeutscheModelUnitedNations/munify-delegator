<script lang="ts">
	import type { PageData } from './$houdini';
	import Supervisor from './stages/Supervisor.svelte';
	import SingleParticipantRegistrationStage from './stages/SingleParticipantRegistrationStage.svelte';
	import SingleParticipantPreparationStage from './stages/SingleParticipantPreparationStage.svelte';
	import DelegationRegistrationStage from './stages/DelegationRegistrationStage.svelte';
	import DelegationPreparationStage from './stages/DelegationPreparationStage.svelte';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import ConferenceStatusWidget from './ConferenceStatusWidget.svelte';
	import ApplicationRejected from '$lib/components/ApplicationRejected.svelte';
	import Certificate from './stages/Certificate.svelte';

	// the app needs some proper loading states!
	//TODO https://houdinigraphql.com/guides/loading-states

	let { data }: { data: PageData } = $props();
	let conferenceQueryData = $derived(data.conferenceQueryData);
	let conference = $derived(conferenceQueryData?.findUniqueConference);
	let status = $derived(conferenceQueryData?.findUniqueConferenceParticipantStatus);
</script>

<div class="flex w-full flex-col items-center">
	<div class="flex w-full flex-col gap-10">
		<!-- TODO add "new" badge if content of this changes -->
		{#if conferenceQueryData?.findUniqueSingleParticipant?.id}
			{#if conference!.state === 'PARTICIPANT_REGISTRATION'}
				<SingleParticipantRegistrationStage data={{ ...conferenceQueryData, user: data.user }} />
			{:else if conferenceQueryData?.findUniqueSingleParticipant?.assignedRole}
				{#if conference!.state === 'PREPARATION' || conference!.state === 'ACTIVE'}
					<ConferenceStatusWidget
						conferenceId={conference!.id}
						userId={data.user.sub}
						{status}
						ofAgeAtConference={data.ofAgeAtConference}
						unlockPayment={conference?.unlockPayments}
						unlockPostals={conference?.unlockPostals}
					/>
					<SingleParticipantPreparationStage data={{ ...conferenceQueryData, user: data.user }} />
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
		{:else if conferenceQueryData?.findUniqueDelegationMember?.id}
			{#if conference!.state === 'PARTICIPANT_REGISTRATION'}
				<DelegationRegistrationStage data={{ ...conferenceQueryData, user: data.user }} />
			{:else if !!conferenceQueryData?.findUniqueDelegationMember?.delegation?.assignedNation || !!conferenceQueryData?.findUniqueDelegationMember?.delegation?.assignedNonStateActor}
				{#if conference!.state === 'PREPARATION' || conference!.state === 'ACTIVE'}
					<ConferenceStatusWidget
						conferenceId={conference!.id}
						userId={data.user.sub}
						ofAgeAtConference={data.ofAgeAtConference}
						{status}
						unlockPayment={conference?.unlockPayments}
						unlockPostals={conference?.unlockPostals}
					/>
					<DelegationPreparationStage data={{ ...conferenceQueryData, user: data.user }} />
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
		{:else if conferenceQueryData?.findUniqueConferenceSupervisor}
			{#if (conference!.state !== 'PARTICIPANT_REGISTRATION' && conferenceQueryData.findUniqueConferenceSupervisor.delegations.filter((x) => !!x.assignedNation || !!x.assignedNonStateActor).length > 0) || conference!.state === 'PARTICIPANT_REGISTRATION'}
				{#if conference!.state === 'POST'}
					<Certificate
						conferenceId={conference!.id}
						userId={data.user.sub}
						didAttend={!!data.conferenceQueryData?.findUniqueConferenceParticipantStatus?.didAttend}
					/>
				{:else}
					<Supervisor
						user={data.user}
						conferenceData={conferenceQueryData}
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
