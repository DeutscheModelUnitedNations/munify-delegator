<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { LineChart } from '$lib/components/charts/echarts';
	import { client } from '$lib/api/rumbleClient/client';
	import { statsQueryFilter } from '../stats.svelte';

	let { conferenceId }: { conferenceId: string } = $props();

	const stats = $derived(
		await client.liveQuery.getConferenceStatistics({
			__args: { conferenceId, filter: statsQueryFilter() },
			registrationTimeline: {
				date: true,
				cumulativeDelegationMembers: true,
				cumulativeSingleParticipants: true,
				cumulativeSupervisors: true
			}
		})
	);
	const registrationTimeline = $derived(stats.registrationTimeline);

	// Format date for display
	const formatDate = (dateStr: string): string => {
		const date = new Date(dateStr);
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	};

	const xAxisData = $derived(registrationTimeline.map((entry) => formatDate(entry.date)));

	const series = $derived([
		{
			name: m.registrationsTotal(),
			data: registrationTimeline.map(
				(entry) =>
					entry.cumulativeDelegationMembers +
					entry.cumulativeSingleParticipants +
					entry.cumulativeSupervisors
			),
			smooth: true,
			areaStyle: true,
			lineStyle: { width: 3 }
		},
		{
			name: m.statsDelegationMembers(),
			data: registrationTimeline.map((entry) => entry.cumulativeDelegationMembers),
			smooth: true,
			areaStyle: false
		},
		{
			name: m.statsSingleParticipants(),
			data: registrationTimeline.map((entry) => entry.cumulativeSingleParticipants),
			smooth: true,
			areaStyle: false
		},
		{
			name: m.supervisors(),
			data: registrationTimeline.map((entry) => entry.cumulativeSupervisors),
			smooth: true,
			areaStyle: false
		}
	]);
</script>

<!-- Hidden entirely while there is nothing to show. -->
{#if registrationTimeline.length > 0}
	<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12">
		<div class="card-body p-4">
			<h2 class="card-title text-base font-semibold">
				<i class="fa-duotone fa-chart-line text-base-content/70"></i>
				{m.statsRegistrationTimeline()}
			</h2>
			<p class="text-xs text-base-content/60">{m.statsTimelineDisclaimer()}</p>

			{#if registrationTimeline.length === 0}
				<div class="flex h-40 items-center justify-center text-sm opacity-50">
					{m.noDataAvailable()}
				</div>
			{:else}
				<div class="mt-3">
					<LineChart {xAxisData} {series} height="350px" yAxisName={m.statsParticipants()} />
				</div>
			{/if}
		</div>
	</section>
{/if}
