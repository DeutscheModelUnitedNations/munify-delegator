<!--
	@component
	What is left after the conference: who gets a participation certificate and how many were told
	by mail it is there, the money still open (unpaid participants from the statistics, payments
	waiting for a decision, live), and a short checklist (a thank-you announcement after the end).
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { asCount } from '#lib/api/queryHelpers';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import WidgetMeter from '#lib/components/dashboard/WidgetMeter.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { reviewCases } from '../../../team/payments/reviewCases';
	import { fetchPaymentsInReview } from './paymentReviews';
	import { mayOpen, type WidgetSize } from '../teamWidgets';
	import type { WaitingAccess } from '../teamWaiting';
	import { freshness } from './freshness';

	let {
		conferenceId,
		size,
		access
	}: { conferenceId: string; size: WidgetSize; access: WaitingAccess } = $props();

	const seesAnnouncements = $derived(mayOpen({ routeId: 'announcement', access }));

	const [conference, holderCount, emailStats, stats, inReview, thanks] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				totalParticipants: true,
				endConference: true
			}),
			client.query.certificateHoldersCount({ __args: { conferenceId } }),
			client.query.emailStats({ __args: { conferenceId }, kind: true, sent: true }),
			client.query.getConferenceStatistics({
				__args: { conferenceId },
				refreshedAt: true,
				postalPaymentProgress: { paymentPending: true, paymentProblem: true }
			}),
			fetchPaymentsInReview(conferenceId),
			seesAnnouncements
				? client.liveQuery.announcements({
						__args: {
							where: { conferenceId: { eq: conferenceId }, status: 'PUBLISHED' },
							orderBy: { publishAt: 'desc' },
							limit: 1
						},
						publishAt: true
					})
				: undefined
		])
	);

	const holders = $derived(asCount(holderCount));
	const notified = $derived(
		emailStats.find((stat) => stat.kind === 'CERTIFICATE_AVAILABLE')?.sent ?? 0
	);
	const unpaid = $derived(
		stats.postalPaymentProgress.paymentPending + stats.postalPaymentProgress.paymentProblem
	);
	const cases = $derived(reviewCases(inReview).length);
	const thanked = $derived(
		thanks === undefined
			? undefined
			: thanks.some(
					(announcement) =>
						!!announcement.publishAt &&
						new Date(announcement.publishAt).getTime() >
							new Date(conference.endConference).getTime()
				)
	);
	const number = (n: number) => n.toLocaleString(getLocale());
	const paymentsHref = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/team/payments', { conferenceId })
	);
</script>

<DashboardWidget
	icon="flag-banner"
	title={m.teamWidgetWrapUpTitle()}
	{size}
	testId="wrap-up"
	note={freshness(stats.refreshedAt)}
>
	<div class="grid gap-4 {size === 'large' ? 'md:grid-cols-2' : ''}">
		<div class="bg-base-200 rounded-box flex flex-col gap-2 p-4">
			<span class="text-base-content/70 text-xs font-semibold uppercase tracking-wide"
				>{m.teamWidgetWrapUpCertificates()}</span
			>
			<div class="flex items-baseline gap-2">
				<span class="text-3xl font-extralight tabular-nums" data-testid="wrap-up-holders"
					>{number(holders)}</span
				>
				<span class="text-base-content/70 text-sm"
					>{m.teamWidgetWrapUpHolders({ count: number(conference.totalParticipants) })}</span
				>
			</div>
			<WidgetMeter label={m.teamWidgetWrapUpNotified()} value={notified} max={holders} />
			{#if mayOpen({ routeId: 'attendance', access })}
				<a
					class="btn btn-ghost btn-sm self-start"
					href={resolve('/(authenticated)/dashboard/[conferenceId]/team/attendance', {
						conferenceId
					})}
				>
					{m.teamWidgetWrapUpAttendance()}
					<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
				</a>
			{/if}
		</div>
		<div class="bg-base-200 rounded-box flex flex-col gap-2 p-4">
			<span class="text-base-content/70 text-xs font-semibold uppercase tracking-wide"
				>{m.teamWidgetWrapUpMoney()}</span
			>
			{#if unpaid === 0 && cases === 0}
				<p class="text-base-content/70 flex items-center gap-2">
					<i aria-hidden="true" class="ph-duotone ph-check-circle text-success text-xl"></i>
					{m.teamWidgetWrapUpMoneySettled()}
				</p>
			{:else}
				<ul class="flex flex-col gap-1.5">
					<li class="flex justify-between gap-3">
						<span>{m.teamWidgetWrapUpUnpaid()}</span>
						<b class="tabular-nums">{number(unpaid)}</b>
					</li>
					<li class="flex justify-between gap-3">
						<span>{m.teamWidgetWrapUpReview()}</span>
						<b class="tabular-nums">{number(cases)}</b>
					</li>
				</ul>
			{/if}
			<a class="btn btn-ghost btn-sm self-start" href={paymentsHref}>
				{m.teamWidgetPaymentsLink()}
				<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
			</a>
		</div>
	</div>
	{#if thanked !== undefined}
		<p class="flex items-center gap-2" data-testid="wrap-up-thanks" data-done={thanked}>
			<i
				aria-hidden="true"
				class="text-xl {thanked
					? 'ph-fill ph-check-circle text-success'
					: 'ph-duotone ph-circle-dashed text-base-content/50'}"
			></i>
			{#if thanked}
				{m.teamWidgetWrapUpThanked()}
			{:else}
				<a
					class="link link-hover"
					href={resolve('/(authenticated)/dashboard/[conferenceId]/team/announcement', {
						conferenceId
					})}>{m.teamWidgetWrapUpThank()}</a
				>
			{/if}
		</p>
	{/if}
</DashboardWidget>
