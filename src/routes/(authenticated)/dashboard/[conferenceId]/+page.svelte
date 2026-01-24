<script lang="ts">
	import type { PageData } from './$houdini';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import ConferenceHeader from '$lib/components/Dashboard/ConferenceHeader.svelte';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import AnnouncementContent from '$lib/components/Dashboard/AnnouncementContent.svelte';
	import { m } from '$lib/paraglide/messages';
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
	import { onMount } from 'svelte';
	import TeamMemberDashboard from './stages/TeamMember/TeamMemberDashboard.svelte';
	import { configPublic } from '$config/public';

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
	let isDelegatee = $derived(
		!!delegationMember?.id && !singleParticipant?.id && !supervisor?.id && !teamMember?.id
	);
	let showNewBadge = $state(false);

	const getContentSignature = () =>
		JSON.stringify({
			conference,
			delegationMember,
			singleParticipant,
			supervisor,
			teamMember,
			status,
			surveyQuestions,
			surveyAnswers
		});

	onMount(() => {
		if (!conference?.id || !data.user?.sub) return;
		const storageKey = `dashboard-content:${conference.id}:${data.user.sub}`;
		const signature = getContentSignature();
		const previousSignature = localStorage.getItem(storageKey);
		showNewBadge = !!previousSignature && previousSignature !== signature;
		localStorage.setItem(storageKey, signature);
	});
</script>

<div class="flex w-full flex-col items-center">
	<div class="flex w-full flex-col gap-10">
		{#if conference?.id && isDelegatee}
			<div class="flex justify-end">
				<a href={`/dashboard/${conference.id}/messaging`} class="btn btn-outline">
					<i class="fa-solid fa-envelope"></i>
					{m.messagingMessaging()}
				</a>
			</div>
		{/if}
		{#if showNewBadge}
			<div class="flex justify-end">
				<span class="badge badge-primary badge-outline uppercase">new</span>
			</div>
		{/if}
		{#if conference}
			<ConferenceHeader
				title={conference.title}
				longTitle={conference.longTitle}
				state={conference.state}
				startDate={conference.startConference}
				endDate={conference.endConference}
				emblemDataURL={conference.emblemDataURL}
				logoDataURL={conference.logoDataURL}
			/>
			{#if conference.info && !teamMember}
				<DashboardSection
					icon="bullhorn"
					title={m.announcementSectionTitle()}
					description={m.announcementSectionDescription()}
					variant="info"
				>
					<AnnouncementContent info={conference.info} showExpanded={conference.showInfoExpanded} />
				</DashboardSection>
			{/if}
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
						customConferenceRole={singleParticipant.assignedRole}
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
							{m.messagingMessaging()}
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
						country={delegationMember.delegation.assignedNation}
						nonStateActor={delegationMember.delegation.assignedNonStateActor}
						assignedCommittee={delegationMember.assignedCommittee}
					/>
				{/if}
			{:else}
				<ApplicationRejected conferenceIdForWaitingListLink={conference.id} />
			{/if}
		{:else if supervisor}
			{@const atLeastOneAccepted =
				conference!.state !== 'PARTICIPANT_REGISTRATION' &&
				(supervisor.supervisedDelegationMembers
					.flatMap((x) => x.delegation)
					.filter((x) => !!x.assignedNation || !!x.assignedNonStateActor).length > 0 ||
					supervisor.supervisedSingleParticipants.filter((x) => x.assignedRole).length > 0)}
			{#if atLeastOneAccepted || conference!.state === 'PARTICIPANT_REGISTRATION'}
				{#if conference!.state === 'POST'}
					{@const acceptedDelegations = supervisor.supervisedDelegationMembers
						.map((x) => x.delegation)
						.filter((x) => !!x.assignedNation || !!x.assignedNonStateActor)}
					{@const acceptedSingleParticipants = supervisor.supervisedSingleParticipants.filter(
						(x) => !!x.assignedRole
					)}
					{@const totalStudents =
						supervisor.supervisedDelegationMembers.length +
						supervisor.supervisedSingleParticipants.length}
					{@const acceptedStudents = acceptedDelegations.length + acceptedSingleParticipants.length}
					<Certificate
						conferenceId={conference!.id}
						userId={data.user.sub}
						didAttend={!!status?.didAttend}
						isSupervisor={true}
						totalStudentsCount={totalStudents}
						acceptedStudentsCount={acceptedStudents}
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
			<TeamMemberDashboard
				conferenceId={conference!.id}
				conferenceTitle={conference!.title}
				role={teamMember.role}
				linkToTeamWiki={conference?.linkToTeamWiki}
				linkToServicesPage={conference?.linkToServicesPage}
				linkToPreparationGuide={conference?.linkToPreparationGuide}
				docsUrl={configPublic.PUBLIC_DOCS_URL}
			/>
		{:else}
			<NoConferenceIndicator />
		{/if}
	</div>
</div>
