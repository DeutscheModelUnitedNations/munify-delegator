<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import CountryStats from '$lib/components/CountryStats/CountryStats.svelte';
	import type { PageData } from '../$houdini';
	import { m } from '$lib/paraglide/messages';
	import TaskAlertCard from '$lib/components/TasksAlert/TaskAlertCard.svelte';
	import TasksWrapper from '$lib/components/TasksAlert/TasksWrapper.svelte';
	import formatNames from '$lib/services/formatNames';
	import getSimplifiedPostalStatus from '$lib/services/getSimplifiedPostalStatus';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
	import generatePaperInboxLinkWithParams from '$lib/services/paperInboxLink';

	let {
		data
	}: {
		data: PageData['conferenceQueryData'] & Pick<PageData, 'user'>;
	} = $props();

	const delegationStats = $derived([
		{
			icon: 'users',
			title: m.members(),
			value: data.findUniqueDelegationMember?.delegation.members.length,
			desc: m.inTheDelegation()
		}
	]);
</script>

<TasksWrapper>
	{#if !!data.findUniqueDelegationMember?.delegation.assignedNation && !!data.findUniqueDelegationMember?.delegation.members.every((member) => !member.assignedCommittee)}
		<TaskAlertCard
			severity={data.findUniqueDelegationMember!.isHeadDelegate ? 'warning' : 'info'}
			faIcon="fa-arrows-turn-to-dots"
			title={m.committeeAssignment()}
			description={data.findUniqueDelegationMember!.isHeadDelegate
				? m.committeeAssignmentAlertDescription()
				: m.committeeAssignmentAlertDescriptionNonHeadDelegate()}
			btnText={data.findUniqueDelegationMember!.isHeadDelegate ? m.assignCommittees() : undefined}
			btnLink={data.findUniqueDelegationMember!.isHeadDelegate
				? `./${data.findUniqueConference?.id}/committeeAssignment`
				: undefined}
		/>
	{/if}
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

<section class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">{m.delegationStatus()}</h2>
	<div class="stats bg-base-200 shadow">
		<RoleWidget
			country={data.findUniqueDelegationMember?.delegation.assignedNation}
			committees={data.findUniqueDelegationMember?.delegation.assignedNation &&
				data.findUniqueConference?.committees.filter((c) =>
					c.nations.some(
						(n) =>
							n.alpha3Code ===
							data.findUniqueDelegationMember?.delegation.assignedNation?.alpha3Code
					)
				)}
			nonStateActor={data.findUniqueDelegationMember?.delegation.assignedNonStateActor}
		/>
	</div>
	<GenericWidget content={delegationStats} />
</section>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">{m.delegationMembers()}</h2>
	<DelegationStatusTableWrapper withEmail withCommittee withPostalSatus withPaymentStatus>
		{#each data.findUniqueDelegationMember?.delegation.members ?? [] as member}
			{@const participantStatus = member.user.conferenceParticipantStatus.find(
				(x) => x.conference.id === data.findUniqueConference?.id
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
					ofAgeAtConference(data.findUniqueConference?.startConference, member.user.birthday)
				)}
				paymentStatus={participantStatus?.paymentStatus}
			/>
		{/each}
	</DelegationStatusTableWrapper>
	{#if data.findUniqueDelegationMember?.delegation.supervisors.length ?? 0 > 0}
		<DelegationStatusTableWrapper
			title={m.supervisors()}
			description={m.supervisorDelegationDescription()}
			withEmail
		>
			{#each data.findUniqueDelegationMember?.delegation.supervisors ?? [] as supervisor}
				<DelegationStatusTableEntry
					name={formatNames(supervisor.user.given_name, supervisor.user.family_name)}
					pronouns={supervisor.user.pronouns ?? ''}
					email={supervisor.user.email}
				/>
			{/each}
		</DelegationStatusTableWrapper>
	{/if}
</section>
<section class="flex flex-col">
	{#if data.findUniqueDelegationMember?.delegation.assignedNation}
		<h2 class="mb-4 text-2xl font-bold">{m.informationOnYourCountry()}</h2>
		<CountryStats
			countryCode={data.findUniqueDelegationMember?.delegation.assignedNation?.alpha3Code}
		/>
	{:else if data.findUniqueDelegationMember?.delegation.assignedNonStateActor}
		{@const nsa = data.findUniqueDelegationMember?.delegation.assignedNonStateActor}
		<h2 class="mb-4 text-2xl font-bold">{m.informationOnYourNSA()}</h2>
		<div class="prose">
			<h3 class="font-bold">{nsa.name}</h3>
			<p>{nsa.description}</p>
		</div>
	{/if}
</section>
