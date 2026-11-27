<!--
	@component
	How full the conference is: during the registration the people registered against the seats on
	offer, afterwards those holding a seat; who they are by part, and the waiting list. Seats and
	the waiting list are live, the breakdown comes from the statistics (with how fresh they are).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import WidgetMeter from '#lib/components/dashboard/WidgetMeter.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { mayOpen, type WidgetSize } from '../teamWidgets';
	import type { WaitingAccess } from '../teamWaiting';
	import { freshness } from './freshness';

	let {
		conferenceId,
		size,
		access
	}: { conferenceId: string; size: WidgetSize; access: WaitingAccess } = $props();

	const [conference, stats] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				state: true,
				totalSeats: true,
				totalParticipants: true,
				waitingListLength: true
			}),
			client.query.getConferenceStatistics({
				__args: { conferenceId },
				refreshedAt: true,
				registered: {
					total: true,
					delegationMembers: { total: true },
					singleParticipants: { total: true },
					supervisors: true
				}
			})
		])
	);

	const registering = $derived(conference.state === 'PARTICIPANT_REGISTRATION');
	const number = (n: number) => n.toLocaleString(getLocale());
</script>

<DashboardWidget
	icon="users-three"
	title={m.teamWidgetParticipantsTitle()}
	{size}
	testId="participants"
	note={freshness(stats.refreshedAt)}
	href={resolve('/(authenticated)/dashboard/[conferenceId]/team/participants', { conferenceId })}
	linkLabel={m.teamWidgetParticipantsLink()}
>
	{#if registering}
		<WidgetMeter
			label={m.teamWidgetParticipantsRegistered()}
			value={stats.registered.total}
			max={conference.totalSeats}
		/>
	{:else}
		<WidgetMeter
			label={m.teamWidgetParticipantsSeated()}
			value={conference.totalParticipants}
			max={conference.totalSeats}
		/>
	{/if}
	<dl class="grid grid-cols-3 gap-2">
		<div>
			<dt class="text-base-content/70 text-sm">{m.teamWidgetParticipantsDelegates()}</dt>
			<dd class="text-xl font-bold tabular-nums">
				{number(stats.registered.delegationMembers.total)}
			</dd>
		</div>
		<div>
			<dt class="text-base-content/70 text-sm">{m.teamWidgetParticipantsSingles()}</dt>
			<dd class="text-xl font-bold tabular-nums">
				{number(stats.registered.singleParticipants.total)}
			</dd>
		</div>
		<div>
			<dt class="text-base-content/70 text-sm">{m.teamWidgetParticipantsSupervisors()}</dt>
			<dd class="text-xl font-bold tabular-nums">{number(stats.registered.supervisors)}</dd>
		</div>
	</dl>
	<div class="border-base-200 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
		<span class="text-base-content/70 text-sm">
			{m.teamWidgetParticipantsWaitingList({ count: conference.waitingListLength })}
		</span>
		{#if mayOpen({ routeId: 'waitingList', access })}
			<a
				class="btn btn-ghost btn-sm"
				href={resolve('/(authenticated)/dashboard/[conferenceId]/team/waiting-list', {
					conferenceId
				})}
			>
				{m.teamWidgetParticipantsWaitingListLink()}
				<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
			</a>
		{/if}
	</div>
</DashboardWidget>
