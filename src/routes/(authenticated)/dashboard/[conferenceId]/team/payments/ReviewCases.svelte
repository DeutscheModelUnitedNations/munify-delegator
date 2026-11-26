<!--
	@component
	The payments page's first section: every payment waiting for a person's decision
	(`NEEDS_HUMAN_REVIEW`), as one case per transfer that flagged it (`reviewCases`). Live: a decided
	case leaves the list.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import ReviewCase from './ReviewCase.svelte';
	import { reviewCases, withPeople } from './reviewCases';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const [read, conference, lastMatch] = $derived(
		await Promise.all([
			client.liveQuery.paymentTransactions({
				__args: {
					where: {
						conference: { id: { eq: conferenceId } },
						paymentFor: { participant: { paymentStatus: 'NEEDS_HUMAN_REVIEW' } }
					},
					orderBy: { createdAt: 'asc' }
				},
				amount: true,
				recievedAt: true,
				payerParticipantId: true,
				paymentFor: {
					conferenceParticipantId: true,
					participant: { paymentStatus: true }
				},
				bankTransfers: {
					externalId: true,
					amount: true,
					bookedAt: true,
					result: true,
					counterparty: true,
					purpose: true
				}
			}),
			client.liveQuery.conference({ __args: { id: conferenceId }, currency: true }),
			// when the bank payment sync last matched a transfer of this conference
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

	const paymentIds = $derived(read.map((payment) => payment.id));

	// read on their own: a person participant care may not see (no part any more) leaves a gap
	const users = $derived(
		paymentIds.length === 0
			? []
			: await client.liveQuery.users({
					__args: {
						where: {
							paymentTransactionsReferences: { paymentTransaction: { id: { in: paymentIds } } }
						}
					},
					givenName: true,
					familyName: true,
					conferenceParticipants: {
						__args: { where: { conferenceId: { eq: conferenceId } } },
						id: true
					}
				})
	);

	const cases = $derived(reviewCases(withPeople({ payments: read, users })));
	const currency = $derived(conference.currency ?? 'EUR');
	const lastMatchAt = $derived(lastMatch[0]?.createdAt);
</script>

<section
	aria-labelledby="payment-review-title"
	class="flex flex-col gap-4 rounded-box bg-base-200 p-4 sm:p-6"
	data-tour="team.payments.review"
>
	<header class="flex flex-col gap-1">
		<div class="flex flex-wrap items-center gap-3">
			<h2 id="payment-review-title" class="text-2xl font-bold">{m.paymentsReviewTitle()}</h2>
			{#if cases.length > 0}
				<span class="badge badge-primary">{m.paymentsReviewOpen({ count: cases.length })}</span>
			{/if}
		</div>
		<p class="text-base-content/70">{m.paymentsReviewDescription()}</p>
		{#if lastMatchAt}
			<p class="text-sm text-base-content/60">
				{m.paymentsLastSync({
					date: new Date(lastMatchAt).toLocaleString(getLocale(), {
						dateStyle: 'medium',
						timeStyle: 'short'
					})
				})}
			</p>
		{/if}
	</header>

	{#if cases.length === 0}
		<div class="flex flex-col items-center justify-center gap-2 py-8 text-center">
			<i aria-hidden="true" class="ph-duotone ph-check-circle text-4xl text-success"></i>
			<p class="text-base-content/70">{m.paymentsReviewEmpty()}</p>
		</div>
	{:else}
		<div class="flex flex-col gap-4">
			{#each cases as reviewCase, index (reviewCase.key)}
				<ReviewCase
					{conferenceId}
					{reviewCase}
					{currency}
					position={index + 1}
					total={cases.length}
				/>
			{/each}
		</div>
	{/if}
</section>
