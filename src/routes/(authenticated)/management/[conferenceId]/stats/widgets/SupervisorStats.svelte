<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { PieChart, StackedBarChart } from '$lib/components/Charts/ECharts';
	import type { SupervisorStats } from '../stats.svelte';

	interface Props {
		supervisorStats: SupervisorStats;
	}

	let { supervisorStats }: Props = $props();

	// Pie chart data: Accepted vs Rejected
	const acceptanceData = $derived([
		{ name: m.statsSupervisorAccepted(), value: supervisorStats.accepted },
		{ name: m.statsSupervisorRejected(), value: supervisorStats.rejected }
	]);

	// Stacked bar chart: 4-category breakdown
	const breakdownData = $derived([
		{
			name: m.statsSupervisorAcceptedPresent(),
			value: supervisorStats.acceptedAndPresent,
			color: '#22c55e'
		},
		{
			name: m.statsSupervisorAcceptedAbsent(),
			value: supervisorStats.acceptedAndNotPresent,
			color: '#84cc16'
		},
		{
			name: m.statsSupervisorRejectedPresent(),
			value: supervisorStats.rejectedAndPresent,
			color: '#f97316'
		},
		{
			name: m.statsSupervisorRejectedAbsent(),
			value: supervisorStats.rejectedAndNotPresent,
			color: '#ef4444'
		}
	]);

	// Attendance pie chart data
	const attendanceData = $derived([
		{ name: m.statsSupervisorPlansAttendance(), value: supervisorStats.plansAttendance },
		{ name: m.statsSupervisorNotAttending(), value: supervisorStats.doesNotPlanAttendance }
	]);
</script>

<section
	class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-8 xl:row-span-3"
>
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-chalkboard-user text-base-content/70"></i>
			{m.statsSupervisorOverview()}
		</h2>

		<!-- Summary stats -->
		<div class="stats bg-base-100 w-full">
			<div class="stat py-2 px-3">
				<div class="stat-title text-xs">{m.supervisors()}</div>
				<div class="stat-value text-xl">{supervisorStats.total}</div>
			</div>
			<div class="stat py-2 px-3">
				<div class="stat-title text-xs">{m.statsSupervisorAccepted()}</div>
				<div class="stat-value text-xl text-success">{supervisorStats.accepted}</div>
			</div>
			<div class="stat py-2 px-3">
				<div class="stat-title text-xs">{m.statsSupervisorPlansAttendance()}</div>
				<div class="stat-value text-xl text-info">{supervisorStats.plansAttendance}</div>
			</div>
		</div>

		<!-- Charts -->
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Acceptance Status Chart -->
			<div class="rounded-lg bg-base-100 p-4">
				<h3 class="mb-2 text-center text-sm font-medium">{m.statsSupervisorAcceptanceStatus()}</h3>
				<PieChart data={acceptanceData} donut height="180px" showLegend={true} />
			</div>

			<!-- Attendance Status Chart -->
			<div class="rounded-lg bg-base-100 p-4">
				<h3 class="mb-2 text-center text-sm font-medium">{m.statsSupervisorAttendanceStatus()}</h3>
				<PieChart data={attendanceData} donut height="180px" showLegend={true} />
			</div>
		</div>

		<!-- Breakdown Bar -->
		<div class="rounded-lg bg-base-100 p-4">
			<h3 class="mb-2 text-sm font-medium">{m.statsSupervisorBreakdown()}</h3>
			<StackedBarChart data={breakdownData} height="40px" showLabels={true} showPercentage={true} />
			<div class="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
				<span class="flex items-center gap-1">
					<span class="inline-block h-3 w-3 rounded" style="background-color: #22c55e"></span>
					{m.statsSupervisorAcceptedPresent()}: {supervisorStats.acceptedAndPresent}
				</span>
				<span class="flex items-center gap-1">
					<span class="inline-block h-3 w-3 rounded" style="background-color: #84cc16"></span>
					{m.statsSupervisorAcceptedAbsent()}: {supervisorStats.acceptedAndNotPresent}
				</span>
				<span class="flex items-center gap-1">
					<span class="inline-block h-3 w-3 rounded" style="background-color: #f97316"></span>
					{m.statsSupervisorRejectedPresent()}: {supervisorStats.rejectedAndPresent}
				</span>
				<span class="flex items-center gap-1">
					<span class="inline-block h-3 w-3 rounded" style="background-color: #ef4444"></span>
					{m.statsSupervisorRejectedAbsent()}: {supervisorStats.rejectedAndNotPresent}
				</span>
			</div>
		</div>
	</div>
</section>
