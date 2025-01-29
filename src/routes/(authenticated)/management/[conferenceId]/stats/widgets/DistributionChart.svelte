<script lang="ts">
	import StackChart from '$lib/components/Charts/StackChart.svelte';
	import * as m from '$lib/paraglide/messages';
	import { registrationFilter } from '../stats.svelte';
	import type { PageData } from '../$types';
	let { data }: { data: PageData } = $props();
	let stats = $derived(data.stats);

	let { getFilteredValue } = registrationFilter();

	let chartProps = {
		icons: ['users-viewfinder', 'user-tie', 'chalkboard-user'],
		labels: [m.delegationMembers(), m.singleParticipants(), m.supervisors()]
	};
</script>

<section
	class="card col-span-2 row-span-1 grow bg-primary text-primary-content shadow-sm md:col-span-8 xl:col-span-3 xl:row-span-3"
>
	{#if stats.registered}
		<div class="hidden xl:contents">
			<StackChart
				{...chartProps}
				values={[
					getFilteredValue(stats.registered.delegationMembers)!,
					getFilteredValue(stats.registered.singleParticipants)!,
					stats.registered.supervisors
				]}
				vertical
			/>
		</div>
		<div class="contents xl:hidden">
			<StackChart
				{...chartProps}
				values={[
					getFilteredValue(stats.registered.delegationMembers)!,
					getFilteredValue(stats.registered.singleParticipants)!,
					stats.registered.supervisors
				]}
			/>
		</div>
	{:else}
		<p>{m.noDataAvailable()}</p>
	{/if}
</section>
