<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getHistory, getSelectedHistory } from '../stats.svelte';
	import StatsDesc from './StatsDesc.svelte';
	import StackChart from '$lib/components/Charts/StackChart.svelte';
	import type { PageData } from '../$types';
	let { data }: { data: PageData } = $props();
	let stats = $derived(data.stats);

	const stackChartProps = {
		values: [stats!.registered.applied, stats!.registered.notApplied],
		icons: ['check', 'hourglass-half'],
		labels: [m.registrationApplied(), m.registrationNotApplied()]
	};

	let selectedHistory = $derived.by(() =>
		getHistory()?.find((x) => x.timestamp === getSelectedHistory())
	);
</script>

<section
	class="stats stats-vertical col-span-2 bg-base-200 shadow-sm xl:stats-horizontal md:col-span-8 xl:col-span-6"
>
	<div class="stat">
		<div class="stat-figure xl:hidden"><i class="fa-duotone fa-sigma text-3xl"></i></div>
		<div class="stat-title">{m.registrationsTotal()}</div>
		<div class="stat-value">{stats?.registered.total}</div>
		<StatsDesc
			currentValue={stats?.registered.total}
			historicValue={selectedHistory?.stats.registered.total}
		/>
	</div>
	<div class="stat">
		<div class="stat-figure xl:hidden"><i class="fa-duotone fa-check text-3xl"></i></div>
		<div class="stat-title">{m.registrationApplied()}</div>
		<div class="stat-value">{stats?.registered.applied}</div>
		<StatsDesc
			currentValue={stats?.registered.applied}
			historicValue={selectedHistory?.stats.registered.applied}
		/>
	</div>
	<div class="stat">
		<div class="stat-figure xl:hidden"><i class="fa-duotone fa-hourglass-half text-3xl"></i></div>
		<div class="stat-title">{m.registrationNotApplied()}</div>
		<div class="stat-value">{stats?.registered.notApplied}</div>
		<StatsDesc
			currentValue={stats?.registered.notApplied}
			historicValue={selectedHistory?.stats.registered.notApplied}
		/>
	</div>
</section>
<section
	class="card col-span-2 grow bg-primary text-primary-content shadow-sm md:col-span-4 xl:col-span-6"
>
	{#if stats?.registered}
		<div class="hidden md:contents xl:hidden">
			<StackChart {...stackChartProps} vertical />
		</div>
		<div class="contents md:hidden xl:contents">
			<StackChart {...stackChartProps} />
		</div>
	{:else}
		<p>{m.noDataAvailable()}</p>
	{/if}
</section>
