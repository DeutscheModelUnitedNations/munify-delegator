<script lang="ts">
	import DelegationStatusTableWrapper from '$lib/components/DelegationStatusTable/Wrapper.svelte';
	import DelegationStatusTableEntry from '$lib/components/DelegationStatusTable/Entry.svelte';
	import RoleWidget from '$lib/components/DelegationStats/RoleWidget.svelte';
	import GenericWidget from '$lib/components/DelegationStats/GenericWidget.svelte';
	import CountryStats from '$lib/components/countryStats/CountryStats.svelte';
</script>

<section class="flex flex-col gap-2">
	<h2 class="text-2xl font-bold">Delegationsstatus</h2>
	<div class="stats shadow bg-base-200">
		<RoleWidget countryCode="gb" />
	</div>
	<GenericWidget content={testData.munsh25.stats} />
</section>

<section class="flex flex-col gap-2">
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
</section>
<section class="flex flex-col">
	<h2 class="text-2xl font-bold mb-4">Informationen zu ihrem Land</h2>
	<CountryStats countryCode="gmb" />
</section>
