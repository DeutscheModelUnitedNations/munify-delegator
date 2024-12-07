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

	const delegationStats = $derived([
		{
			icon: 'users',
			title: m.members(),
			value: data.findUniqueDelegationMember?.delegation.members.length,
			desc: m.inTheDelegation()
		}
	]);
</script>

<section class="flex flex-col gap-4">
	<h2 class="text-2xl font-bold">Delegationsstatus</h2>
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
	<h2 class="text-2xl font-bold">Delegationsmitglieder</h2>
	<!-- <DelegationStatusTableWrapper withCommittee withMailStatus withPaymentStatus> -->
	<DelegationStatusTableWrapper>
		{#each data.findUniqueDelegationMember?.delegation.members ?? [] as member}
			<DelegationStatusTableEntry
				name={`${member.user.given_name} ${member.user.family_name}`}
				pronouns={member.user.pronouns ?? ''}
				headDelegate={member.isHeadDelegate}
			/>
		{/each}
	</DelegationStatusTableWrapper>
</section>
<section class="flex flex-col">
	{#if data.findUniqueDelegationMember?.delegation.assignedNation}
		<h2 class="mb-4 text-2xl font-bold">Informationen zu ihrem Land</h2>
		<CountryStats
			countryCode={data.findUniqueDelegationMember?.delegation.assignedNation?.alpha3Code}
		/>
	{:else if data.findUniqueDelegationMember?.delegation.assignedNonStateActor}
		{@const nsa = data.findUniqueDelegationMember?.delegation.assignedNonStateActor}
		<h2 class="mb-4 text-2xl font-bold">Informationen zu ihrer Organisation</h2>
		<div class="prose">
			<h3 class="font-bold">{nsa.name}</h3>
			<p>{nsa.description}</p>
		</div>
	{/if}
</section>
