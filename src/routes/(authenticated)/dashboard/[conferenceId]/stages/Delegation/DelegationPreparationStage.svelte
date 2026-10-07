<script lang="ts">
	import RoleWidget from '$lib/components/delegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/delegationStats/GenericWidget.svelte';
	import CountryStats from '$lib/components/countryStats/CountryStats.svelte';
	import { m } from '$lib/paraglide/messages';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';
	import SupervisorTable from '../Common/SupervisorTable.svelte';
	import DelegationNameDisplay from '$lib/components/DelegationNameDisplay.svelte';
	import DashboardQuickLinks from '../../sections/DashboardQuickLinks.svelte';
	import DelegationMembersStatusSection from './DelegationMembersStatusSection.svelte';

	interface Props {
		conferenceId: string;
		delegationMember: NonNullable<MyConferenceParticipation['delegationMember']>;
		user: {
			sub: string;
			email: string;
		};
		status: MyConferenceParticipation['participantStatus'];
		ofAgeAtConference: boolean;
	}

	let { conferenceId, delegationMember, user, status, ofAgeAtConference }: Props = $props();

	const assignedNation = $derived(delegationMember.delegation.assignedNation);
	// A primitive, so the queries below only run again when the delegation actually changes rather
	// than on every live update of the membership they were handed.
	const delegationId = $derived(delegationMember.delegation.id);

	const [delegation, conference] = $derived(
		await Promise.all([
			client.liveQuery.delegation({
				__args: { id: delegationId },
				members: { id: true, assignedCommittee: { id: true } }
			}),
			client.liveQuery.conference({
				__args: { id: conferenceId },
				committees: {
					id: true,
					name: true,
					numOfSeatsPerDelegation: true,
					nations: { alpha3Code: true }
				}
			})
		])
	);

	const delegationStats = $derived([
		{
			icon: 'users',
			title: m.members(),
			value: delegation.members.length,
			desc: m.inTheDelegation()
		}
	]);
</script>

<DashboardQuickLinks
	{conferenceId}
	userType="delegation"
	{user}
	{status}
	{ofAgeAtConference}
	extraContext={{
		isHeadDelegate: delegationMember.isHeadDelegate,
		hasNationAssigned: !!assignedNation,
		membersLackCommittees: delegation.members.some((member) => !member.assignedCommittee)
	}}
/>

<DashboardSection
	icon="chart-line"
	title={m.delegationStatus()}
	description={m.delegationStatusDescription()}
>
	<div class="stats bg-base-200 shadow">
		<RoleWidget
			country={assignedNation}
			committees={assignedNation &&
				conference.committees.filter((c) =>
					c.nations.some((n) => n.alpha3Code === assignedNation.alpha3Code)
				)}
			nonStateActor={delegationMember.delegation.assignedNonStateActor}
		/>
	</div>
	<GenericWidget content={delegationStats} />
	<DelegationNameDisplay {delegationId} />
</DashboardSection>

<DelegationMembersStatusSection {conferenceId} {delegationId} />

<SupervisorTable delegationMemberId={delegationMember.id} {conferenceId} />

{#if assignedNation}
	<DashboardSection
		icon="globe"
		title={m.informationOnYourCountry()}
		description={m.informationOnYourCountryDescription()}
	>
		<CountryStats countryCode={assignedNation.alpha3Code} />
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
