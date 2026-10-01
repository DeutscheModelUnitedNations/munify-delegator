<script lang="ts">
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { ofAgeAtConference } from '$lib/helpers/ageChecker';
	import { page } from '$app/state';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import { makeApplicationForm } from './applicationForm';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import ConferenceHeader from '$lib/components/dashboard/ConferenceHeader.svelte';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import AnnouncementContent from '$lib/components/dashboard/AnnouncementContent.svelte';
	import { m } from '$lib/paraglide/messages';
	import ConferenceStatusWidget from './ConferenceStatusWidget.svelte';
	import ApplicationRejected from '$lib/components/ApplicationRejected.svelte';
	import SingleParticipantRegistrationStage from './stages/SingleParticipant/SingleParticipantRegistrationStage.svelte';
	import SingleParticipantPreparationStage from './stages/SingleParticipant/SingleParticipantPreparationStage.svelte';
	import DelegationRegistrationStage from './stages/Delegation/DelegationRegistrationStage.svelte';
	import DelegationPreparationStage from './stages/Delegation/DelegationPreparationStage.svelte';
	import TeamMemberDashboard from './stages/TeamMember/TeamMemberDashboard.svelte';
	import Supervisor from './stages/Supervisor/Supervisor.svelte';
	import { configPublic } from '$config/public';
	import SurveySection from '$lib/components/dashboard/SurveySection.svelte';
	import ChunkLoadError from '$lib/components/ChunkLoadError.svelte';
	import type { PageProps } from './$types';

	const currentUser = $derived(await getCurrentUser());

	let { params }: PageProps = $props();

	const participation = $derived(await fetchMyParticipation(params.conferenceId));
	const isOfAgeAtConference = $derived(
		ofAgeAtConference(participation?.conference?.startConference, participation?.user?.birthday)
	);
	const applicationForm = $derived(makeApplicationForm(participation ?? undefined));
	let conference = $derived(participation?.conference);
	let delegationMember = $derived(participation?.delegationMember);
	let singleParticipant = $derived(participation?.singleParticipant);
	let supervisor = $derived(participation?.supervisor);
	let teamMember = $derived(participation?.teamMember);
	let status = $derived(participation?.participantStatus);
</script>

<div class="flex w-full flex-col items-center">
	<div class="flex w-full flex-col gap-10">
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
			{#if conference.showCalendar || teamMember}
				{#await import('$lib/components/dashboard/CalendarSection.svelte') then { default: CalendarSection }}
					<CalendarSection conferenceId={conference.id} timezone={conference.timezone} />
				{:catch error}
					<ChunkLoadError {error} />
				{/await}
			{/if}
		{/if}
		{#if (singleParticipant?.assignedRole || delegationMember?.delegation?.assignedNation || delegationMember?.delegation?.assignedNonStateActor) && (conference?.state === 'PREPARATION' || conference?.state === 'ACTIVE')}
			<SurveySection
				conferenceId={conference!.id}
				userId={currentUser.sub}
				conferenceTimezone={conference!.timezone}
			/>
		{/if}
		<!-- TODO add "new" badge if content of this changes -->
		{#if singleParticipant?.id}
			{#if conference!.state === 'PARTICIPANT_REGISTRATION'}
				<SingleParticipantRegistrationStage {singleParticipant} {conference} {applicationForm} />
			{:else if singleParticipant?.assignedRole}
				{#if conference!.state === 'PREPARATION' || conference!.state === 'ACTIVE'}
					<ConferenceStatusWidget
						conferenceId={conference!.id}
						userId={currentUser.sub}
						{status}
						ofAgeAtConference={isOfAgeAtConference}
						unlockPayment={conference?.unlockPayments}
						unlockPostals={conference?.unlockPostals}
					/>
					<SingleParticipantPreparationStage
						{conference}
						{singleParticipant}
						user={currentUser}
						{status}
						ofAgeAtConference={isOfAgeAtConference}
					/>
				{:else if conference!.state === 'POST'}
					{#await import('./stages/Common/Certificate.svelte') then { default: Certificate }}
						<Certificate
							conferenceId={conference!.id}
							userId={currentUser.sub}
							didAttend={!!participation?.participantStatus?.didAttend}
							customConferenceRole={singleParticipant.assignedRole}
						/>
					{:catch error}
						<ChunkLoadError {error} />
					{/await}
				{/if}
			{:else}
				<ApplicationRejected conferenceIdForWaitingListLink={conference.id} />
			{/if}
		{:else if delegationMember?.id}
			{#if conference!.state === 'PARTICIPANT_REGISTRATION'}
				<DelegationRegistrationStage {delegationMember} {conference} {applicationForm} />
			{:else if !!delegationMember?.delegation?.assignedNation || !!delegationMember?.delegation?.assignedNonStateActor}
				{#if conference!.state === 'PREPARATION' || conference!.state === 'ACTIVE'}
					<ConferenceStatusWidget
						conferenceId={conference!.id}
						userId={currentUser.sub}
						ofAgeAtConference={isOfAgeAtConference}
						{status}
						unlockPayment={conference?.unlockPayments}
						unlockPostals={conference?.unlockPostals}
					/>
					<DelegationPreparationStage
						{delegationMember}
						{conference}
						user={currentUser}
						{status}
						ofAgeAtConference={isOfAgeAtConference}
					/>
				{:else if conference!.state === 'POST'}
					{#await import('./stages/Common/Certificate.svelte') then { default: Certificate }}
						<Certificate
							conferenceId={conference!.id}
							userId={currentUser.sub}
							didAttend={!!status?.didAttend}
							country={delegationMember.delegation.assignedNation}
							nonStateActor={delegationMember.delegation.assignedNonStateActor}
							assignedCommittee={delegationMember.assignedCommittee}
						/>
					{:catch error}
						<ChunkLoadError {error} />
					{/await}
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
					{#await import('./stages/Common/Certificate.svelte') then { default: Certificate }}
						<Certificate
							conferenceId={conference!.id}
							userId={currentUser.sub}
							didAttend={!!status?.didAttend}
							isSupervisor={true}
							totalStudentsCount={totalStudents}
							acceptedStudentsCount={acceptedStudents}
						/>
					{:catch error}
						<ChunkLoadError {error} />
					{/await}
				{:else}
					<Supervisor
						user={currentUser}
						{conference}
						{supervisor}
						{status}
						ofAge={isOfAgeAtConference}
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
