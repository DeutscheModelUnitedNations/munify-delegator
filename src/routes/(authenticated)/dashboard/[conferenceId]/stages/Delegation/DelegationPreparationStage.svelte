<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import CountryStats from '$lib/components/CountryStats/CountryStats.svelte';
	import { m } from '$lib/paraglide/messages';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import DashboardLinksGrid from '$lib/components/Dashboard/DashboardLinksGrid.svelte';
	import DashboardLinkCard from '$lib/components/Dashboard/DashboardLinkCard.svelte';
	import { getLinksForUserType, type DashboardLinkContext } from '$lib/config/dashboardLinks';
	import formatNames from '$lib/services/formatNames';
	import getSimplifiedPostalStatus from '$lib/services/getSimplifiedPostalStatus';
	import { ofAgeAtConference } from '$lib/services/ageChecker';
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

	const linkContext = $derived<DashboardLinkContext>({
		conferenceId: conference.id,
		userType: 'delegation',
		conferenceState: conference.state,
		isHeadDelegate: delegationMember.isHeadDelegate,
		unlockPayments: conference.unlockPayments,
		unlockPostals: conference.unlockPostals,
		hasConferenceInfo: !!conference.info,
		linkToPreparationGuide: conference.linkToPreparationGuide,
		isOpenPaperSubmission: conference.isOpenPaperSubmission,
		linkToPaperInbox: conference.linkToPaperInbox,
		surveyQuestionCount: surveyQuestions?.length ?? 0,
		surveyAnswerCount: surveyAnswers?.length ?? 0,
		hasNationAssigned: !!delegationMember.delegation.assignedNation,
		membersLackCommittees: delegationMember.delegation.members.some(
			(member) => !member.assignedCommittee
		),
		user
	});

	const visibleLinks = $derived(getLinksForUserType('delegation', linkContext));
</script>

<DashboardSection icon="link" title={m.quickLinks()} description={m.quickLinksDescription()}>
	<DashboardLinksGrid>
		{#each visibleLinks as link (link.id)}
			{@const badge = link.getBadge?.(linkContext)}
			<DashboardLinkCard
				href={link.getHref(linkContext)}
				icon={link.icon}
				title={link.getTitle()}
				description={link.getDescription()}
				external={link.external}
				disabled={link.isDisabled(linkContext)}
				badge={badge?.value}
				badgeType={badge?.type}
			/>
		{/each}
	</DashboardLinksGrid>
</DashboardSection>

<DashboardSection
	icon="chart-line"
	title={m.delegationStatus()}
	description={m.delegationStatusDescription()}
>
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
</DashboardSection>

<DashboardSection
	icon="users"
	title={m.delegationMembers()}
	description={m.delegationMembersDescription()}
>
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
</DashboardSection>

<SupervisorTable supervisors={delegationMember.supervisors} conferenceId={conference.id} />

{#if delegationMember.delegation.assignedNation}
	<DashboardSection
		icon="globe"
		title={m.informationOnYourCountry()}
		description={m.informationOnYourCountryDescription()}
	>
		<CountryStats countryCode={delegationMember.delegation.assignedNation?.alpha3Code} />
	</DashboardSection>
{:else if delegationMember.delegation.assignedNonStateActor}
	{@const nsa = delegationMember.delegation.assignedNonStateActor}
	<DashboardSection
		icon="building-ngo"
		title={m.informationOnYourNSA()}
		description={m.informationOnYourNSADescription()}
	>
		<div class="prose">
			<h3 class="font-bold">{nsa.name}</h3>
			<p>{nsa.description}</p>
		</div>
	</DashboardSection>
{/if}
