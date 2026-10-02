<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import { getSelectedHistoryEntry, statsQueryFilter } from '../stats.svelte';
	import StatsDesc from './StatsDesc.svelte';
	import { StackedBarChart } from '$lib/components/charts/echarts';
	import { acceptanceChartData, acceptedOf, rejectedOf } from './chartData';

	let { conferenceId }: { conferenceId: string } = $props();

	const stats = $derived(
		await client.liveQuery.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			registered: { total: true, applied: true, notApplied: true, supervisors: true },
			roleBased: {
				delegationMembersWithRole: true,
				delegationMembersWithoutRole: true,
				singleParticipantsWithRole: true,
				singleParticipantsWithoutRole: true
			}
		})
	);

	let selectedHistory = $derived(getSelectedHistoryEntry());

	// Data for the stacked bar chart
	const chartData = $derived(acceptanceChartData(stats));

	const historic = $derived(selectedHistory?.stats);
	const historicRoleBased = $derived(historic?.roleBased);

	/** The figures of the stats row, each against the selected history entry. */
	const total = $derived((stats?.registered.total ?? 0) + (stats?.registered.supervisors ?? 0));
	const accepted = $derived(stats?.roleBased ? acceptedOf(stats.roleBased) : 0);
	const rejected = $derived(stats?.roleBased ? rejectedOf(stats.roleBased) : 0);

	const statItems: {
		title: string;
		value: number;
		currentValue: number | undefined;
		historicValue: number | undefined;
		valueClass: string;
	}[] = $derived([
		{
			title: m.registrationsTotal(),
			value: total,
			currentValue: total,
			historicValue: (historic?.registered.total ?? 0) + (historic?.registered.supervisors ?? 0),
			valueClass: ''
		},
		{
			title: m.registrationApplied(),
			value: stats?.registered.applied ?? 0,
			currentValue: stats?.registered.applied,
			historicValue: historic?.registered.applied,
			valueClass: ''
		},
		{
			title: m.statsFilterAccepted(),
			value: accepted,
			currentValue: accepted,
			historicValue: historicRoleBased ? acceptedOf(historicRoleBased) : undefined,
			valueClass: 'text-success'
		},
		{
			title: m.statsFilterRejected(),
			value: rejected,
			currentValue: rejected,
			historicValue: historicRoleBased ? rejectedOf(historicRoleBased) : undefined,
			valueClass: 'text-warning'
		},
		{
			title: m.registrationNotApplied(),
			value: stats?.registered.notApplied ?? 0,
			currentValue: stats?.registered.notApplied,
			historicValue: historic?.registered.notApplied,
			valueClass: ''
		}
	]);
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-12">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-chart-pie text-base-content/70"></i>
			{m.registrationsTotal()}
		</h2>
		<p class="text-xs text-base-content/60">{m.statsTotalDisclaimer()}</p>

		<!-- Stats row -->
		<div class="stats bg-base-100 w-full">
			{#each statItems as item (item.title)}
				<div class="stat py-3 px-4">
					<div class="stat-title text-xs">{item.title}</div>
					<div class="stat-value text-2xl {item.valueClass}">{item.value}</div>
					<StatsDesc currentValue={item.currentValue} historicValue={item.historicValue} />
				</div>
			{/each}
		</div>

		<!-- Stacked bar chart -->
		{#if chartData.length > 0}
			<div class="mt-3 rounded-lg bg-base-100 p-4">
				<StackedBarChart data={chartData} height="40px" showPercentage={true} />
			</div>
		{/if}
	</div>
</section>
