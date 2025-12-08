<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import CountryStats from '$lib/components/CountryStats/CountryStats.svelte';
	import { m } from '$lib/paraglide/messages';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import formatNames from '$lib/services/formatNames';
	import getSimplifiedPostalStatus from '$lib/services/getSimplifiedPostalStatus';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import generatePaperInboxLinkWithParams from '$lib/services/paperInboxLink';
	import type { MyConferenceparticipationQuery$result } from '$houdini';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import DelegationNameDisplay from '$lib/components/DelegationNameDisplay.svelte';

	interface Props {
		delegationMember: NonNullable<
			MyConferenceparticipationQuery$result['findUniqueDelegationMember']
		>;
		conference: NonNullable<MyConferenceparticipationQuery$result['findUniqueConference']>;
		surveyQuestions: NonNullable<MyConferenceparticipationQuery$result['findManySurveyQuestions']>;
		surveyAnswers: NonNullable<MyConferenceparticipationQuery$result['findManySurveyAnswers']>;
		user: {
			sub: string;
			email: string;
		};
	}

	let { delegationMember, conference, surveyAnswers, surveyQuestions, user }: Props = $props();

	const delegationStats = $derived([
		{
			icon: 'users',
			title: m.members(),
			value: delegationMember.delegation.members.length,
			desc: m.inTheDelegation()
		}
	]);
</script>

<TasksWrapper>
	{#if !!delegationMember.delegation.assignedNation && !!delegationMember.delegation.members.every((member) => !member.assignedCommittee)}
		<TaskAlertCard
			severity={delegationMember.isHeadDelegate ? 'warning' : 'info'}
			faIcon="fa-arrows-turn-to-dots"
			title={m.committeeAssignment()}
			description={delegationMember.isHeadDelegate
				? m.committeeAssignmentAlertDescription()
				: m.committeeAssignmentAlertDescriptionNonHeadDelegate()}
			btnText={delegationMember.isHeadDelegate ? m.assignCommittees() : undefined}
			btnLink={delegationMember.isHeadDelegate
				? `./${conference.id}/committeeAssignment`
				: undefined}
		/>
	{/if}
	{#if surveyQuestions && surveyQuestions.length > 0}
		<TaskAlertCard
			faIcon="fa-square-poll-horizontal"
			title={m.survey()}
			description={m.surveyDescription()}
			btnText={m.goToSurvey()}
			btnLink={`./${conference.id}/survey`}
			severity={surveyQuestions.length > surveyAnswers.length ? 'warning' : 'info'}
		/>
	{/if}
	{#if conference.info}
		<TaskAlertCard
			faIcon="fa-info-circle"
			title={m.conferenceInfo()}
			description={m.conferenceInfoDescription()}
			btnText={m.goToConferenceInfo()}
			btnLink={`./${conference.id}/info`}
		/>
	{/if}
	{#if conference.linkToPreparationGuide}
		<TaskAlertCard
			faIcon="fa-book-bookmark"
			title={m.preparation()}
			description={m.preparationDescription()}
			btnText={m.goToPreparation()}
			btnLink={conference.linkToPreparationGuide}
			btnExternal
		/>
	{/if}
	{#if conference.isOpenPaperSubmission && user}
		<TaskAlertCard
			faIcon="fa-files"
			title={m.paperHub()}
			description={m.paperHubDescription()}
			btnText={m.paperHubBtn()}
			btnLink="/dashboard/{conference.id}/paperhub"
			btnExternal
			severity="info"
		/>
	{/if}
	{#if conference.linkToPaperInbox && user}
		<TaskAlertCard
			faIcon="fa-file-circle-plus"
			title={m.paperInbox()}
			description={m.paperInboxDescription()}
			btnText={m.paperInboxBtn()}
			btnLink={generatePaperInboxLinkWithParams(conference.linkToPaperInbox, user)}
			btnExternal
			severity="info"
		/>
	{/if}
</TasksWrapper>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.delegationStatus()}</h2>
	<div class="stats bg-base-200 shadow">
		<RoleWidget
			country={delegationMember.delegation.assignedNation}
			committees={delegationMember.delegation.assignedNation &&
				conference.committees.filter((c) =>
					c.nations.some(
						(n) => n.alpha3Code === delegationMember.delegation.assignedNation?.alpha3Code
					)
				)}
			nonStateActor={delegationMember.delegation.assignedNonStateActor}
		/>
	</div>
	<GenericWidget content={delegationStats} />
	<DelegationNameDisplay delegationId={delegationMember.delegation.id} />
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationMembers()}</h2>
	<DelegationStatusTableWrapper withEmail withCommittee withPostalSatus withPaymentStatus>
		{#each delegationMember.delegation.members ?? [] as member}
			{@const participantStatus = member.user.conferenceParticipantStatus.find(
				(x) => x.conference.id === conference.id
			)}
			<DelegationStatusTableEntry
				name={formatNames(member.user.given_name, member.user.family_name)}
				pronouns={member.user.pronouns ?? ''}
				headDelegate={member.isHeadDelegate}
				email={member.user.email}
				committee={member.assignedCommittee?.abbreviation ?? ''}
				withPaymentStatus
				withPostalStatus
				postalSatus={getSimplifiedPostalStatus(
					participantStatus,
					ofAgeAtConference(conference.startConference, member.user.birthday)
				)}
				paymentStatus={participantStatus?.paymentStatus}
			/>
		{/each}
	</DelegationStatusTableWrapper>
	<div class="h-4"></div>
	<SupervisorTable supervisors={delegationMember.supervisors} conferenceId={conference.id} />
</section>
<section class="flex flex-col">
	{#if delegationMember.delegation.assignedNation}
		<h2 class="mb-4 text-2xl font-bold">{m.informationOnYourCountry()}</h2>
		<CountryStats countryCode={delegationMember.delegation.assignedNation?.alpha3Code} />
	{:else if delegationMember.delegation.assignedNonStateActor}
		{@const nsa = delegationMember.delegation.assignedNonStateActor}
		<h2 class="mb-4 text-2xl font-bold">{m.informationOnYourNSA()}</h2>
		<div class="prose">
			<h3 class="font-bold">{nsa.name}</h3>
			<p>{nsa.description}</p>
		</div>
	{/if}
</section>
