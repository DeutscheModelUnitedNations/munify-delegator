<script lang="ts">
	import ChartBar from '$lib/components/Charts/ChartBar.svelte';
	import * as m from '$lib/paraglide/messages';
	import { getStats } from '../stats.svelte';

	let stats = getStats();
</script>

<section
	class="card col-span-2 grow bg-primary text-primary-content shadow-sm md:col-span-12 xl:col-span-6"
>
	<div class="card-body mb-4 pb-0">
		<h3 class="text-xs">{m.averageAgeOnlyApplied()}</h3>
		<h2 class="card-title">{stats?.age.average ?? '0'} {m.years()}</h2>
	</div>
	{#if stats?.age}
		<ChartBar
			values={Object.values(stats?.age.distribution)}
			labels={Object.keys(stats?.age.distribution)}
			formatter={(v, l) => {
				return `${v}x ${l} ${m.years()}`;
			}}
		/>
	{:else}
		<p>Keine Daten verfügbar</p>
	{/if}
</section>
