<script lang="ts">
	import ChartBar from '$lib/components/Charts/ChartBar.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from '../$types';
	let { data }: { data: PageData } = $props();
	let stats = $derived(data.stats);
</script>

<section
	class="bg-primary card col-span-2 grow text-primary-content shadow-sm md:col-span-12 xl:col-span-6"
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
		<p>{m.noDataAvailable()}</p>
	{/if}
</section>
