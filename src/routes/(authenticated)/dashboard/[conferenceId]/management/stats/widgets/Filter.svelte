<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime';
	import { client } from '$lib/api/rumbleClient/client';
	import { unifiedFilter, type StatsFilterOption } from '../stats.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	let { getFilter, setFilter } = unifiedFilter();

	// The figures come from materialized views the server recomputes every few minutes, so they
	// lag behind the data; say by how much.
	const stats = $derived(
		await client.query.getConferenceStatistics({
			__args: { conferenceId },
			refreshedAt: true
		})
	);
	const refreshedAt = $derived(
		stats.refreshedAt?.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' })
	);

	const filterOptions: { value: StatsFilterOption; label: () => string }[] = [
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
			onchange={(e) => setFilter(e.currentTarget.value as StatsFilterOption)}
		>
			{#each filterOptions as option (option.value)}
				<option value={option.value} selected={getFilter() === option.value}>
					{option.label()}
				</option>
			{/each}
		</select>
		{#if refreshedAt}
			<p class="text-xs text-base-content/60">{m.statsRefreshedAt({ time: refreshedAt })}</p>
		{/if}
	</div>
</section>
