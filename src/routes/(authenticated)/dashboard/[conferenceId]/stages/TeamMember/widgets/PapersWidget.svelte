<!--
	@component
	Where the conference's papers are: by status (from the statistics), how many wait for a review
	right now (live, as the waiting tiles count them), the caller's own reviews, and the agenda items
	whose reviewers asked for help.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import { asCount } from '#lib/api/queryHelpers';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import type { WidgetSize } from '../teamWidgets';
	import { freshness } from './freshness';

	let { conferenceId, size }: { conferenceId: string; size: WidgetSize } = $props();

	const papersWith = (status: 'SUBMITTED' | 'REVISED') =>
		client.liveQuery.papersCount({
			__args: { where: { conference: { id: { eq: conferenceId } }, status } }
		});

	const [stats, submitted, revised, mine, helpNeeded] = $derived(
		await Promise.all([
			client.query.getConferenceStatistics({
				__args: { conferenceId },
				refreshedAt: true,
				paperStats: {
					total: true,
					byStatus: {
						draft: true,
						submitted: true,
						changesRequested: true,
						revised: true,
						accepted: true
					}
				}
			}),
			papersWith('SUBMITTED'),
			papersWith('REVISED'),
			client.liveQuery.myReviewStats({ __args: { conferenceId }, totalReviews: true }),
			client.liveQuery.committeeAgendaItems({
				__args: {
					where: {
						committee: { conferenceId: { eq: conferenceId } },
						reviewHelpStatus: 'HELP_NEEDED'
					}
				},
				title: true,
				committee: { abbreviation: true }
			})
		])
	);

	const byStatus = $derived(stats.paperStats.byStatus);
	const waiting = $derived(asCount(submitted) + asCount(revised));
	const number = (n: number) => n.toLocaleString(getLocale());

	/** The segments of the status bar, in the order a paper goes through them */
	const segments = $derived(
		[
			{
				key: 'accepted',
				label: m.teamWidgetPapersAccepted(),
				value: byStatus.accepted,
				class: 'bg-primary'
			},
			{
				key: 'changesRequested',
				label: m.teamWidgetPapersChangesRequested(),
				value: byStatus.changesRequested,
				class: 'bg-secondary'
			},
			{
				key: 'waiting',
				label: m.teamWidgetPapersWaiting(),
				value: byStatus.submitted + byStatus.revised,
				class: 'bg-accent'
			},
			{
				key: 'draft',
				label: m.teamWidgetPapersDraft(),
				value: byStatus.draft,
				class: 'bg-base-300'
			}
		].filter((segment) => segment.value > 0)
	);
	const total = $derived(segments.reduce((sum, segment) => sum + segment.value, 0));
	const summary = $derived(
		segments.map((segment) => `${number(segment.value)} ${segment.label}`).join(', ')
	);
</script>

<DashboardWidget
	icon="files"
	title={m.teamWidgetPapersTitle()}
	{size}
	testId="papers"
	note={freshness(stats.refreshedAt)}
	href={resolve('/(authenticated)/dashboard/[conferenceId]/paperhub', { conferenceId })}
	linkLabel={m.teamWidgetPapersLink()}
	empty={total === 0 && waiting === 0 ? m.teamWidgetPapersEmpty() : undefined}
>
	{#if total > 0}
		<div class="rounded-box flex h-5 w-full overflow-hidden" role="img" aria-label={summary}>
			{#each segments as segment (segment.key)}
				<div class={segment.class} style:width="{(segment.value / total) * 100}%"></div>
			{/each}
		</div>
		<ul class="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-hidden="true">
			{#each segments as segment (segment.key)}
				<li class="flex items-center gap-1.5">
					<span class="{segment.class} inline-block h-2.5 w-2.5 rounded-full"></span>
					{number(segment.value)}
					{segment.label}
				</li>
			{/each}
		</ul>
	{/if}
	<div class="grid gap-3 sm:grid-cols-2">
		<div class="bg-base-200 rounded-box flex flex-col px-4 py-3">
			<span class="text-base-content/70 text-xs font-semibold uppercase tracking-wide"
				>{m.teamWidgetPapersToReview()}</span
			>
			<span class="text-xl font-bold tabular-nums" data-testid="papers-waiting"
				>{number(waiting)}</span
			>
			{#if mine}
				<span class="text-base-content/70 text-sm"
					>{m.teamWidgetPapersMyReviews({ count: mine.totalReviews })}</span
				>
			{/if}
		</div>
		<div class="bg-base-200 rounded-box flex flex-col px-4 py-3">
			<span class="text-base-content/70 text-xs font-semibold uppercase tracking-wide"
				>{m.teamWidgetPapersHelpNeeded()}</span
			>
			{#if helpNeeded.length === 0}
				<span class="text-base-content/70 text-sm">{m.teamWidgetPapersNoHelpNeeded()}</span>
			{:else}
				<span class="text-xl font-bold tabular-nums">{number(helpNeeded.length)}</span>
				<span class="text-base-content/70 truncate text-sm">
					{helpNeeded
						.slice(0, 3)
						.map((item) => `${item.committee.abbreviation} · ${item.title}`)
						.join(', ')}
				</span>
			{/if}
		</div>
	</div>
</DashboardWidget>
