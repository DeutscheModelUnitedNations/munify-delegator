<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import Bar3DChart from '#lib/components/charts/echarts/Bar3DChart.svelte';
	import {
		TIMELINE_STATUSES,
		paperStatusWeeks,
		paperTimelineChart,
		type TimelineStatus
	} from './paperTimeline';

	// Where each committee's papers stood week by week: the review backlog shows as the yellow
	// share of a committee's column, and how it was worked off going back in time.
	let { conferenceId }: { conferenceId: string } = $props();

	const grouped = $derived(
		await client.query.findPapersGroupedByCommittee({
			__args: { conferenceId },
			committee: { abbreviation: true },
			agendaItems: {
				papers: {
					versions: {
						createdAt: true,
						status: true,
						reviews: { createdAt: true, statusAfter: true }
					}
				}
			}
		})
	);
	const committees = $derived(
		grouped.map((group) => ({
			abbreviation: group.committee.abbreviation,
			papers: group.agendaItems.flatMap((agendaItem) => agendaItem.papers)
		}))
	);

	const statusLabels: Record<TimelineStatus, () => string> = {
		ACCEPTED: () => m.paperStatusAccepted(),
		REVISED: () => m.paperStatusRevised(),
		SUBMITTED: () => m.paperStatusSubmitted(),
		CHANGES_REQUESTED: () => m.paperStatusChangesRequested()
	};
	// The paper hub's status colours (`DetailedPaperStats`).
	const colors: Record<TimelineStatus, string> = {
		ACCEPTED: '#4ade80',
		REVISED: '#38bdf8',
		SUBMITTED: '#facc15',
		CHANGES_REQUESTED: '#f87171'
	};

	const weekLabel = (monday: Date) =>
		m.statsWeekOf({
			date: new Intl.DateTimeFormat(getLocale(), {
				day: '2-digit',
				month: '2-digit',
				timeZone: 'UTC'
			}).format(monday)
		});

	const now = new Date();
	const chart = $derived(
		paperTimelineChart({
			committees,
			now,
			labels: {
				week: weekLabel,
				status: (status) => statusLabels[status](),
				committees: m.committees(),
				weeks: m.statsWeeks(),
				papers: m.papers()
			},
			colors
		})
	);

	// The table sums all committees per week, newest week first.
	const totals = $derived.by(() => {
		const { weeks, cells } = paperStatusWeeks({ committees, now });
		return weeks
			.map((week, index) => ({
				week,
				counts: TIMELINE_STATUSES.map((status) =>
					cells
						.filter((cell) => cell.week === index && cell.status === status)
						.reduce((sum, cell) => sum + cell.count, 0)
				)
			}))
			.toReversed();
	});
</script>

{#if chart.yLabels.length > 0}
	<section class="card border border-base-300 bg-base-200 mt-4">
		<div class="card-body p-4 gap-3">
			<h3 class="card-title text-base font-semibold">
				<i aria-hidden="true" class="ph-duotone ph-cube text-base-content/70"></i>
				{m.statsPaperTimeline()}
			</h3>
			<p class="text-sm text-base-content/70">{m.statsPaperTimelineDescription()}</p>

			<Bar3DChart data={chart} label={m.statsPaperTimeline()} />

			<details class="collapse collapse-arrow border border-base-300">
				<summary class="collapse-title py-2 min-h-0 text-sm font-medium">
					{m.statsShowAsTable()}
				</summary>
				<div class="collapse-content overflow-x-auto">
					<table class="table table-sm">
						<thead>
							<tr>
								<th scope="col">{m.statsWeeks()}</th>
								{#each TIMELINE_STATUSES as status (status)}
									<th scope="col" class="text-right">{statusLabels[status]()}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each totals as row (row.week.getTime())}
								<tr>
									<th scope="row" class="font-normal">{weekLabel(row.week)}</th>
									{#each row.counts as count, index (TIMELINE_STATUSES[index])}
										<td class="text-right tabular-nums">{count}</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</details>
		</div>
	</section>
{/if}
