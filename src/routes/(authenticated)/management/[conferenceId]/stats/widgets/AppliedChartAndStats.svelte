<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getHistory, getSelectedHistory } from '../stats.svelte';
	import StatsDesc from './StatsDesc.svelte';
	import { StackedBarChart } from '$lib/components/Charts/ECharts';
	import type { StatsType } from '../stats.svelte';

	interface Props {
		stats: StatsType;
	}

	let { stats }: Props = $props();

	let selectedHistory = $derived.by(() =>
		getHistory()?.find((x) => x.timestamp === getSelectedHistory())
	);

	// Data for the stacked bar chart
	const chartData = $derived.by(() => {
		if (!stats?.registered || !stats?.roleBased) return [];

		const withRole =
			stats.roleBased.delegationMembersWithRole + stats.roleBased.singleParticipantsWithRole;
		const withoutRole =
			stats.roleBased.delegationMembersWithoutRole + stats.roleBased.singleParticipantsWithoutRole;

		return [
			{ name: m.statsFilterAccepted(), value: withRole, color: '#10b981' }, // emerald/success
			{ name: m.statsFilterRejected(), value: withoutRole, color: '#f59e0b' }, // amber/warning
			{ name: m.registrationNotApplied(), value: stats.registered.notApplied, color: '#6b7280' } // gray
		];
	});
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
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.registrationsTotal()}</div>
				<div class="stat-value text-2xl">
					{(stats?.registered.total ?? 0) + (stats?.registered.supervisors ?? 0)}
				</div>
				<StatsDesc
					currentValue={(stats?.registered.total ?? 0) + (stats?.registered.supervisors ?? 0)}
					historicValue={(selectedHistory?.stats.registered.total ?? 0) +
						(selectedHistory?.stats.registered.supervisors ?? 0)}
				/>
			</div>
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.registrationApplied()}</div>
				<div class="stat-value text-2xl">{stats?.registered.applied ?? 0}</div>
				<StatsDesc
					currentValue={stats?.registered.applied}
					historicValue={selectedHistory?.stats.registered.applied}
				/>
			</div>
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.statsFilterAccepted()}</div>
				<div class="stat-value text-2xl text-success">
					{stats?.roleBased
						? stats.roleBased.delegationMembersWithRole + stats.roleBased.singleParticipantsWithRole
						: 0}
				</div>
				<StatsDesc
					currentValue={stats?.roleBased
						? stats.roleBased.delegationMembersWithRole + stats.roleBased.singleParticipantsWithRole
						: 0}
					historicValue={selectedHistory?.stats.roleBased
						? selectedHistory.stats.roleBased.delegationMembersWithRole +
							selectedHistory.stats.roleBased.singleParticipantsWithRole
						: undefined}
				/>
			</div>
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.statsFilterRejected()}</div>
				<div class="stat-value text-2xl text-warning">
					{stats?.roleBased
						? stats.roleBased.delegationMembersWithoutRole +
							stats.roleBased.singleParticipantsWithoutRole
						: 0}
				</div>
				<StatsDesc
					currentValue={stats?.roleBased
						? stats.roleBased.delegationMembersWithoutRole +
							stats.roleBased.singleParticipantsWithoutRole
						: 0}
					historicValue={selectedHistory?.stats.roleBased
						? selectedHistory.stats.roleBased.delegationMembersWithoutRole +
							selectedHistory.stats.roleBased.singleParticipantsWithoutRole
						: undefined}
				/>
			</div>
			<div class="stat py-3 px-4">
				<div class="stat-title text-xs">{m.registrationNotApplied()}</div>
				<div class="stat-value text-2xl">{stats?.registered.notApplied ?? 0}</div>
				<StatsDesc
					currentValue={stats?.registered.notApplied}
					historicValue={selectedHistory?.stats.registered.notApplied}
				/>
			</div>
		</div>

		<!-- Stacked bar chart -->
		{#if chartData.length > 0}
			<div class="mt-3 rounded-lg bg-base-100 p-4">
				<StackedBarChart data={chartData} height="40px" showPercentage={true} />
			</div>
		{/if}
	</div>
</section>
