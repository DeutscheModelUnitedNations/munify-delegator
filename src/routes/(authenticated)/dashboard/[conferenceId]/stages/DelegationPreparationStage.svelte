<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import CountryStats from '$lib/components/CountryStats/CountryStats.svelte';
	import type { StoresValues } from '$lib/services/storeExtractorType';
	import type { PageData } from '../$houdini';
	import * as m from '$lib/paraglide/messages.js';

	let {
		data
	}: {
		data: NonNullable<StoresValues<PageData['MyConferenceparticipationQuery']>['data']> &
			Pick<PageData, 'user'>;
	} = $props();

	const currentTasks = $derived({
		committeeAssignmentAlert:
			!!data.findUniqueDelegationMember?.delegation.assignedNation &&
			!!data.findUniqueDelegationMember?.delegation.members.every(
				(member) => !member.assignedCommittee
			)
		// Add more tasks here
	});

	const delegationStats = $derived([
		{
			icon: 'users',
			title: m.members(),
			value: data.findUniqueDelegationMember?.delegation.members.length,
			desc: m.inTheDelegation()
		}
	]);
</script>

{#if Object.values(currentTasks).some((task) => task)}
	<section class="flex flex-col gap-4">
		<h2 class="text-2xl font-bold">{m.currentTasks()}</h2>
		{#if currentTasks.committeeAssignmentAlert}
			<div class="alert alert-info">
				<i class="fas fa-arrows-turn-to-dots mx-4 text-3xl"></i>
				<div class="flex flex-col">
					<h3 class="text-xl font-bold">{m.committeeAssignment()}</h3>
					{#if data.findUniqueDelegationMember!.isHeadDelegate}
						<p>{@html m.committeeAssignmentAlertDescription()}</p>
						<a
							class="btn btn-primary mt-4 max-w-sm"
							href="./{data.findUniqueConference?.id}/committeeAssignment"
						>
							{m.assignCommittees()}
						</a>
					{:else}
						<p>{m.committeeAssignmentAlertDescriptionNonHeadDelegate()}</p>
					{/if}
				</div>
			</div>
		{/if}
	</section>
{/if}

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
	<!-- <DelegationStatusTableWrapper withEmail withCommittee withMailStatus withPaymentStatus> -->
	<DelegationStatusTableWrapper withEmail withCommittee>
		{#each data.findUniqueDelegationMember?.delegation.members ?? [] as member}
			<DelegationStatusTableEntry
				name={`${member.user.given_name} ${member.user.family_name}`}
				pronouns={member.user.pronouns ?? ''}
				headDelegate={member.isHeadDelegate}
				email={member.user.email}
				committee={member.assignedCommittee?.abbreviation ?? ''}
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
					name={`${supervisor.user.given_name} ${supervisor.user.family_name}`}
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
