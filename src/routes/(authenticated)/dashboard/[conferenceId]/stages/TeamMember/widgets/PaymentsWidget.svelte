<!--
	@component
	How far payment and postal registration are (from the statistics), and the payments waiting for
	a person's decision, counted as the payments page counts its cases (`reviewCases`), with when
	the bank payment sync last matched a transfer of the conference. The cases are live.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import DashboardWidget from '#lib/components/dashboard/DashboardWidget.svelte';
	import WidgetMeter from '#lib/components/dashboard/WidgetMeter.svelte';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { reviewCases } from '../../../team/payments/reviewCases';
	import { fetchPaymentsInReview } from './paymentReviews';
	import type { WidgetSize } from '../teamWidgets';
	import { freshness } from './freshness';

	let { conferenceId, size }: { conferenceId: string; size: WidgetSize } = $props();

	const [stats, inReview, lastMatch] = $derived(
		await Promise.all([
			client.query.getConferenceStatistics({
				__args: { conferenceId },
				refreshedAt: true,
				postalPaymentProgress: {
					paymentDone: true,
					paymentPending: true,
					paymentProblem: true,
					postalDone: true,
					postalPending: true,
					postalProblem: true
				}
			}),
			fetchPaymentsInReview(conferenceId),
			client.liveQuery.bankTransfers({
				__args: {
					where: { paymentTransaction: { conference: { id: { eq: conferenceId } } } },
					orderBy: { createdAt: 'desc' },
					limit: 1
				},
				createdAt: true
			})
		])
	);

	const progress = $derived(stats.postalPaymentProgress);
	const people = $derived(progress.paymentDone + progress.paymentPending + progress.paymentProblem);
	const postalPeople = $derived(
		progress.postalDone + progress.postalPending + progress.postalProblem
	);
	const cases = $derived(reviewCases(inReview).length);
	const lastMatchAt = $derived(lastMatch[0]?.createdAt);
	const paymentsHref = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/team/payments', { conferenceId })
	);
</script>

<DashboardWidget
	icon="hand-coins"
	title={m.teamWidgetPaymentsTitle()}
	{size}
	testId="payments"
	note={freshness(stats.refreshedAt)}
	href={paymentsHref}
	linkLabel={m.teamWidgetPaymentsLink()}
	empty={people === 0 && cases === 0 ? m.teamWidgetPaymentsEmpty() : undefined}
>
	<div class="grid gap-4 {size === 'large' ? 'md:grid-cols-2' : ''}">
		<WidgetMeter label={m.teamWidgetPaymentsPaid()} value={progress.paymentDone} max={people} />
		<WidgetMeter
			label={m.teamWidgetPaymentsPostal()}
			value={progress.postalDone}
			max={postalPeople}
			tone="accent"
		/>
	</div>
	{#if cases > 0}
		<a
			class="bg-base-200 rounded-box hover:bg-base-300 flex items-center gap-3 px-4 py-3"
			href={paymentsHref}
			data-testid="payments-review-cases"
		>
			<i aria-hidden="true" class="ph-duotone ph-bank text-primary text-2xl"></i>
			<span class="flex-1">{m.teamWidgetPaymentsReviewCases({ count: cases })}</span>
			<span class="text-primary font-semibold">{m.teamWidgetPaymentsReview()}</span>
		</a>
	{/if}
	{#if progress.paymentProblem > 0 || progress.postalProblem > 0}
		<p class="text-base-content/70 text-sm">
			{m.teamWidgetPaymentsProblems({
				payment: progress.paymentProblem,
				postal: progress.postalProblem
			})}
		</p>
	{/if}
	{#if lastMatchAt}
		<p class="text-base-content/60 text-xs">
			{m.paymentsLastSync({
				date: new Date(lastMatchAt).toLocaleString(getLocale(), {
					dateStyle: 'medium',
					timeStyle: 'short'
				})
			})}
		</p>
	{/if}
</DashboardWidget>
