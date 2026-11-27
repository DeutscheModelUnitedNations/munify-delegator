<!--
	@component
	The entrance on the current day (`entranceSummary`): how many holding a seat passed the
	entrance check of a checking session today, how many have not yet, and how many minors lack
	their guardians' consent. Asked again whenever a checking session records a scan.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import WidgetMeter from '#lib/components/dashboard/WidgetMeter.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import type { WidgetSize } from '../teamWidgets';

	let { conferenceId, size }: { conferenceId: string; size: WidgetSize } = $props();

	/** The start of the caller's day: "today" is theirs */
	const startOfDay = (_scanCount: number) => {
		const now = new Date();
		return new Date(now.getFullYear(), now.getMonth(), now.getDate());
	};

	const sessions = $derived(
		await client.liveQuery.attendanceSessions({
			__args: { where: { conferenceId: { eq: conferenceId }, mode: 'CHECK' } },
			entryCount: true
		})
	);
	// A primitive: the summary is asked again when a scan changes it, not on every live update
	const scans = $derived(sessions.reduce((total, session) => total + session.entryCount, 0));

	/** Asked again for every number of scans: the argument only keys the query's re-run */
	const summaryAfter = (scanCount: number) =>
		client.query.entranceSummary({
			__args: { conferenceId, since: startOfDay(scanCount) },
			expected: true,
			checkedIn: true,
			minorsWithoutConsent: true
		});
	const summary = $derived(await summaryAfter(scans));

	const missing = $derived(Math.max(summary.expected - summary.checkedIn, 0));
	const number = (n: number) => n.toLocaleString(getLocale());
	const attendanceHref = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/team/attendance', { conferenceId })
	);
</script>

<DashboardWidget
	icon="door-open"
	title={m.teamWidgetEntranceTitle()}
	{size}
	testId="entrance"
	href={attendanceHref}
	linkLabel={m.teamWidgetEntranceLink()}
	empty={summary.expected === 0 ? m.teamWidgetEntranceNobody() : undefined}
>
	<div class="flex items-baseline gap-2">
		<span class="text-4xl font-extralight tabular-nums" data-testid="entrance-checked-in"
			>{number(summary.checkedIn)}</span
		>
		<span class="text-base-content/70">
			{m.teamWidgetEntranceOf({ count: number(summary.expected) })}
		</span>
	</div>
	<WidgetMeter
		label={m.teamWidgetEntranceCheckedIn()}
		value={summary.checkedIn}
		max={summary.expected}
	/>
	<ul class="flex flex-col gap-2">
		<li class="flex justify-between gap-3">
			<span>{m.teamWidgetEntranceMissing()}</span>
			<b class="tabular-nums">{number(missing)}</b>
		</li>
		<li class="flex justify-between gap-3" data-testid="entrance-minors">
			<span>{m.teamWidgetEntranceMinors()}</span>
			<b class="tabular-nums {summary.minorsWithoutConsent > 0 ? 'text-error' : ''}"
				>{number(summary.minorsWithoutConsent)}</b
			>
		</li>
	</ul>
</DashboardWidget>
