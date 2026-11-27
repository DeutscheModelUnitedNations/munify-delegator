<!--
	@component
	How full the committees are (from the statistics), how many seats are still free, whether a
	draft of the assignment waits to be applied, and whether the assignment is released.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import type { WidgetSize } from '../teamWidgets';
	import { freshness } from './freshness';

	let { conferenceId, size }: { conferenceId: string; size: WidgetSize } = $props();

	const [conference, stats, units, singleRoles] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				totalSeats: true,
				totalParticipants: true,
				assignmentReleased: true
			}),
			client.query.getConferenceStatistics({
				__args: { conferenceId },
				refreshedAt: true,
				committeeFillRates: {
					committeeId: true,
					abbreviation: true,
					name: true,
					totalSeats: true,
					assignedSeats: true
				}
			}),
			client.liveQuery.assignmentUnits({
				__args: { where: { conferenceId: { eq: conferenceId } }, limit: 1 },
				id: true
			}),
			client.liveQuery.assignmentSingleRoles({
				__args: {
					where: { singleParticipant: { conference: { id: { eq: conferenceId } } } },
					limit: 1
				},
				singleParticipantId: true
			})
		])
	);

	const committees = $derived(
		stats.committeeFillRates.filter((committee) => committee.totalSeats > 0)
	);
	const freeSeats = $derived(Math.max(conference.totalSeats - conference.totalParticipants, 0));
	const draftOpen = $derived(units.length > 0 || singleRoles.length > 0);
	const number = (n: number) => n.toLocaleString(getLocale());
</script>

<DashboardWidget
	icon="chairs"
	title={m.teamWidgetCommitteesTitle()}
	{size}
	testId="committees"
	note={freshness(stats.refreshedAt)}
	href={resolve('/(authenticated)/dashboard/[conferenceId]/team/assignment/sighting', {
		conferenceId
	})}
	linkLabel={m.teamWidgetCommitteesLink()}
	empty={committees.length === 0 ? m.teamWidgetCommitteesEmpty() : undefined}
>
	{#snippet headerAction()}
		<span class="badge badge-ghost">{m.teamWidgetCommitteesFreeSeats({ count: freeSeats })}</span>
	{/snippet}
	<ul class="grid gap-2 {size === 'large' ? 'md:grid-cols-2 md:gap-x-8' : ''}">
		{#each committees as committee (committee.committeeId)}
			<li class="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3">
				<abbr class="truncate font-semibold no-underline" title={committee.name}
					>{committee.abbreviation}</abbr
				>
				<progress
					class="progress progress-accent h-2.5 w-full"
					value={committee.assignedSeats}
					max={committee.totalSeats}
					aria-label={committee.name}
				></progress>
				<span class="text-base-content/70 text-right text-sm tabular-nums"
					>{number(committee.assignedSeats)}/{number(committee.totalSeats)}</span
				>
			</li>
		{/each}
	</ul>
	<p class="border-base-200 text-base-content/70 border-t pt-3 text-sm">
		{#if draftOpen}
			{m.teamWidgetCommitteesDraftOpen()}
		{:else if conference.assignmentReleased}
			{m.teamWidgetCommitteesReleased()}
		{:else}
			{m.teamWidgetCommitteesNotReleased()}
		{/if}
	</p>
</DashboardWidget>
