<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import CountryStats from '$lib/components/CountryStats/CountryStats.svelte';
	import type { StoresValues } from '$lib/services/storeExtractorType';
	import type { PageData } from '../$houdini';
	let {
		data
	}: {
		data: NonNullable<StoresValues<PageData['MyConferenceparticipationQuery']>['data']> &
			Pick<PageData, 'user'>;
	} = $props();
</script>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">Delegationsstatus</h2>
	<div class="stats bg-base-200 shadow">
		<RoleWidget
			country={data.findUniqueDelegationMember?.delegation.assignedNation}
			nonStateActor={data.findUniqueDelegationMember?.delegation.assignedNonStateActor}
		/>
	</div>
	<!-- <GenericWidget content={testData.munsh25.stats} /> -->
</section>

<!-- <section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">Delegationsmitglieder</h2>
	<DelegationStatusTableWrapper withCommittee withMailStatus withPaymentStatus>
		<DelegationStatusTableEntry
			name="Max Mustermann"
			headDelegate
			committee="GV"
			mailStatus="completed"
			paymentStatus="completed"
		/>
		<DelegationStatusTableEntry
			name="Frauke Musterfrau"
			committee="WiSo"
			mailStatus="error"
			paymentStatus="incomplete"
		/>
		<DelegationStatusTableEntry
			name="Hans Dampf"
			committee=""
			mailStatus="incomplete"
			paymentStatus="error"
		/>
	</DelegationStatusTableWrapper>
</section> -->
<section class="flex flex-col">
	<h2 class="mb-4 text-2xl font-bold">Informationen zu ihrem Land</h2>
	<CountryStats countryCode="gmb" />
</section>
