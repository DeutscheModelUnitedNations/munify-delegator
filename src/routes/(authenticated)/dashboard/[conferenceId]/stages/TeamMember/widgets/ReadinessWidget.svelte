<!--
	@component
	What the conference still needs before its registration opens or before it takes place
	(`readinessChecks`), each open item linking to where it is done when the caller may open that
	page. Includes the link to MUNify CHASE while one is configured (`ChaseStatus`).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchActiveChaseLink } from '#lib/api/chaseLink';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import { keptBackPapers } from '#lib/helpers/chaseTransfer';
	import { m } from '#lib/paraglide/messages';
	import { createMinuteClock } from '#lib/components/calendar/minuteClock.svelte';
	import { mayOpen, type WidgetSize } from '../teamWidgets';
	import type { WaitingAccess } from '../teamWaiting';
	import ChaseStatus from './ChaseStatus.svelte';
	import { readinessChecks, type ReadinessItem, type ReadinessItemId } from './readiness';

	let {
		conferenceId,
		size,
		access
	}: { conferenceId: string; size: WidgetSize; access: WaitingAccess } = $props();

	const clock = createMinuteClock();

	const [conference, calendarDays, agendaItems, checkSessions, chaseLink] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				state: true,
				totalSeats: true,
				applicationDeadline: true,
				feeAmount: true,
				iban: true,
				contractFileId: true,
				guidePublished: true,
				startConference: true,
				endConference: true,
				certificateFileId: true,
				assignmentReleased: true
			}),
			client.liveQuery.calendarDays({
				__args: { where: { conferenceId: { eq: conferenceId } } },
				date: true
			}),
			client.liveQuery.committeeAgendaItems({
				__args: { where: { committee: { conferenceId: { eq: conferenceId } } } },
				discussionPoints: true
			}),
			client.liveQuery.attendanceSessions({
				__args: { where: { conferenceId: { eq: conferenceId }, mode: 'CHECK' } },
				startedAt: true
			}),
			fetchActiveChaseLink()
		])
	);

	// Read only while a CHASE is linked: the working papers that would reach it
	const papers = $derived(
		chaseLink
			? await client.liveQuery.papers({
					__args: {
						where: {
							type: 'WORKING_PAPER',
							delegation: { conferenceId: { eq: conferenceId } },
							versions: { status: 'ACCEPTED' }
						}
					},
					id: true,
					agendaItem: { title: true, committee: { abbreviation: true, roles: { id: true } } },
					delegation: { assignedRoleId: true, assignedRole: { name: true, nationAlpha3Code: true } }
				})
			: []
	);
	const keptBack = $derived(keptBackPapers(papers));

	const items = $derived(
		readinessChecks({
			state: conference.state,
			now: new Date(clock.time),
			facts: {
				committeeSeats: conference.totalSeats,
				applicationDeadline: conference.applicationDeadline,
				feeAmount: conference.feeAmount,
				iban: conference.iban,
				contractFileId: conference.contractFileId,
				guidePublished: conference.guidePublished,
				startConference: conference.startConference,
				endConference: conference.endConference,
				calendarDays: calendarDays.map((day) => day.date),
				discussionPointCounts: agendaItems.map((item) => item.discussionPoints.length),
				certificateFileId: conference.certificateFileId,
				checkSessions: checkSessions.length,
				chase: chaseLink
					? { reconciled: !!chaseLink.lastReconcileAt, keptBackPapers: keptBack.length }
					: undefined
			}
		})
	);
	const doneCount = $derived(items.filter((item) => item.done).length);

	/** Each item's line: what it says once done, and what while open (given how many are missing) */
	const LABELS: Record<ReadinessItemId, { done: () => string; open: (missing: number) => string }> =
		{
			committees: { done: m.teamWidgetReadyCommittees, open: m.teamWidgetReadyCommitteesOpen },
			applicationDeadline: {
				done: m.teamWidgetReadyDeadline,
				open: m.teamWidgetReadyDeadlineOpen
			},
			fee: { done: m.teamWidgetReadyFee, open: m.teamWidgetReadyFeeOpen },
			bankDetails: { done: m.teamWidgetReadyBank, open: m.teamWidgetReadyBankOpen },
			documents: { done: m.teamWidgetReadyDocuments, open: m.teamWidgetReadyDocumentsOpen },
			guide: { done: m.teamWidgetReadyGuide, open: m.teamWidgetReadyGuideOpen },
			calendar: {
				done: m.teamWidgetReadyCalendar,
				open: (count) => m.teamWidgetReadyCalendarOpen({ count })
			},
			discussionPoints: {
				done: m.teamWidgetReadyPoints,
				open: (count) =>
					count > 0 ? m.teamWidgetReadyPointsOpen({ count }) : m.teamWidgetReadyPointsNoAgenda()
			},
			certificate: {
				done: m.teamWidgetReadyCertificate,
				open: m.teamWidgetReadyCertificateOpen
			},
			checkSession: {
				done: m.teamWidgetReadyCheckSession,
				open: m.teamWidgetReadyCheckSessionOpen
			},
			chase: {
				done: m.teamWidgetReadyChase,
				open: (count) =>
					count > 0 ? m.teamWidgetReadyChaseKeptBack({ count }) : m.teamWidgetReadyChaseOpen()
			}
		};

	const label = (item: ReadinessItem) =>
		item.done ? LABELS[item.id].done() : LABELS[item.id].open(item.missing ?? 0);

	function href(item: ReadinessItem) {
		if (item.done || !mayOpen({ routeId: item.target.routeId, access })) return undefined;
		const query = item.target.query ? `?${item.target.query}` : '';
		return resolve(`dashboard/${conferenceId}/${item.target.path}${query}`);
	}
</script>

<DashboardWidget
	icon="rocket-launch"
	title={conference.state === 'PREPARATION'
		? m.teamWidgetReadyTitleConference()
		: m.teamWidgetReadyTitleRegistration()}
	{size}
	testId="readiness"
	empty={items.length === 0 ? m.teamWidgetReadyNothing() : undefined}
>
	{#snippet headerAction()}
		<span class="badge badge-ghost tabular-nums" data-testid="readiness-progress"
			>{m.teamWidgetReadyProgress({ done: doneCount, total: items.length })}</span
		>
	{/snippet}
	<ul class="grid gap-x-6 gap-y-1 {size === 'large' ? 'md:grid-cols-2' : ''}">
		{#each items as item (item.id)}
			{@const link = href(item)}
			<li
				class="flex min-h-11 items-center gap-3"
				data-testid="readiness-{item.id}"
				data-done={item.done}
			>
				<i
					aria-hidden="true"
					class="text-xl {item.done
						? 'ph-fill ph-check-circle text-success'
						: 'ph-duotone ph-circle-dashed text-base-content/50'}"
				></i>
				<span class="sr-only">{item.done ? m.teamWidgetReadyDone() : m.teamWidgetReadyOpen()}</span>
				{#if link}
					<a class="link link-hover" href={link}>{label(item)}</a>
				{:else}
					<span>{label(item)}</span>
				{/if}
			</li>
		{/each}
	</ul>
	{#if chaseLink && conference.state === 'PREPARATION'}
		<div class="border-base-200 border-t pt-3">
			<ChaseStatus
				{conferenceId}
				remoteUrl={chaseLink.remoteUrl}
				lastReconcileAt={chaseLink.lastReconcileAt}
				assignmentReleased={conference.assignmentReleased}
				{keptBack}
			/>
		</div>
	{/if}
</DashboardWidget>
