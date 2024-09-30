<script lang="ts">
	import ChartBar from '$lib/components/Charts/ChartBar.svelte';
	import * as m from '$lib/paraglide/messages';

	let { ageStats } = $props();
</script>

<section class="card grow col-span-12 bg-primary text-primary-content shadow-sm xl:col-span-6">
	<div class="card-body pb-0">
		<h3 class="text-xs">{m.averageAge()}</h3>
		<h2 class="card-title">{ageStats.average} {m.years()}</h2>
	</div>
	{#if ageStats}
		<ChartBar
			values={Object.values(ageStats.distribution)}
			labels={Object.keys(ageStats.distribution)}
			formatter={(v, l) => {
				return `${v}x ${l} ${m.years()}`;
			}}
		/>
	{:else}
		<p>Keine Daten verfügbar</p>
	{/if}
</section>
