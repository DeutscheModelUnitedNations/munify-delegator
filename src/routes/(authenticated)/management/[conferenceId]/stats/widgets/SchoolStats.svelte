<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { BarChart } from '$lib/components/Charts/ECharts';
	import type { SchoolStats } from '../stats.svelte';

	interface Props {
		schoolStats: SchoolStats[];
	}

	let { schoolStats }: Props = $props();

	// Sort by member count descending
	const sortedData = $derived([...schoolStats].sort((a, b) => b.memberCount - a.memberCount));

	// For chart, limit to top 15
	const chartLabels = $derived(sortedData.slice(0, 15).map((s) => s.school));
	const chartValues = $derived(sortedData.slice(0, 15).map((s) => s.memberCount));

	const totalSchools = $derived(schoolStats.length);
	const totalDelegations = $derived(schoolStats.reduce((acc, s) => acc + s.delegationCount, 0));
	const totalMembers = $derived(schoolStats.reduce((acc, s) => acc + s.memberCount, 0));

	let showTable = $state(false);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-6">
	<div class="card-body p-4">
		<div class="flex items-center justify-between">
			<h2 class="card-title text-base font-semibold">
				<i class="fa-duotone fa-school text-base-content/70"></i>
				{m.statsSchoolStatistics()}
			</h2>
			<div class="join">
				<button
					class="btn btn-sm join-item {!showTable ? 'btn-active' : ''}"
					onclick={() => (showTable = false)}
				>
					<i class="fa-solid fa-chart-bar"></i>
				</button>
				<button
					class="btn btn-sm join-item {showTable ? 'btn-active' : ''}"
					onclick={() => (showTable = true)}
				>
					<i class="fa-solid fa-table"></i>
				</button>
			</div>
		</div>

		{#if schoolStats.length === 0}
			<div class="flex h-40 items-center justify-center text-sm opacity-50">
				{m.noDataAvailable()}
			</div>
		{:else}
			<!-- Summary -->
			<div class="stats bg-base-100 w-full mb-4">
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.statsSchools()}</div>
					<div class="stat-value text-xl">{totalSchools}</div>
				</div>
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.statsDelegations()}</div>
					<div class="stat-value text-xl">{totalDelegations}</div>
				</div>
				<div class="stat py-2 px-3">
					<div class="stat-title text-xs">{m.statsMembers()}</div>
					<div class="stat-value text-xl">{totalMembers}</div>
				</div>
			</div>

			<div class="rounded-lg bg-base-100 p-4">
				{#if showTable}
					<!-- Table view -->
					<div class="max-h-80 overflow-auto">
						<table class="table-zebra table-sm table w-full">
							<thead class="sticky top-0 bg-base-100">
								<tr>
									<th>{m.statsSchool()}</th>
									<th class="text-right">{m.statsDelegations()}</th>
									<th class="text-right">{m.statsMembers()}</th>
								</tr>
							</thead>
							<tbody>
								{#each sortedData as school}
									<tr>
										<td class="max-w-48 truncate">{school.school}</td>
										<td class="text-right">{school.delegationCount}</td>
										<td class="text-right">{school.memberCount}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{:else}
					<!-- Chart view -->
					<BarChart
						labels={chartLabels}
						values={chartValues}
						horizontal
						height="350px"
						xAxisName={m.statsMembers()}
					/>
				{/if}
			</div>
		{/if}
	</div>
</section>
