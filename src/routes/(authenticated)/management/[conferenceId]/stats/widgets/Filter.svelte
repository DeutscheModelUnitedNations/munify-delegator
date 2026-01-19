<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { unifiedFilter, type StatsFilter } from '../stats.svelte';

	let { getFilter, setFilter } = unifiedFilter();

	const filterOptions: { value: StatsFilter; label: () => string }[] = [
		{ value: 'all', label: () => m.statsFilterAll() },
		{ value: 'applied', label: () => m.statsFilterApplied() },
		{ value: 'notApplied', label: () => m.statsFilterNotApplied() },
		{ value: 'appliedWithRole', label: () => m.statsFilterAccepted() },
		{ value: 'appliedWithoutRole', label: () => m.statsFilterRejected() }
	];
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-4 xl:col-span-4">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-filter text-base-content/70"></i>
			{m.statsFilter()}
		</h2>
		<select
			class="select select-bordered w-full bg-base-100"
			onchange={(e) => setFilter(e.currentTarget.value as StatsFilter)}
		>
			{#each filterOptions as option}
				<option value={option.value} selected={getFilter() === option.value}>
					{option.label()}
				</option>
			{/each}
		</select>
	</div>
</section>
