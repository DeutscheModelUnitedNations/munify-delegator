<!--
	@component
	One review case of the payments page: the transfer that flagged one or more payments, what it
	brought against what they ask for, the people they cover, and the decisions. Deciding writes the
	payments' statuses; the live list then drops the case.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import WriteToDelegateButton from '#lib/components/chat/WriteToDelegateButton.svelte';
	import CasePeople from './CasePeople.svelte';
	import CaseTransfer from './CaseTransfer.svelte';
	import {
		type ReviewCase,
		type ReviewPayment,
		type ReviewKind,
		paidDecisions,
		preselected
	} from './reviewCases';

	interface Props {
		conferenceId: string;
		reviewCase: ReviewCase<ReviewPayment>;
		currency: string;
		position: number;
		total: number;
	}

	let { conferenceId, reviewCase, currency, position, total }: Props = $props();

	const id = $props.id();

	/** Who is ticked as paid; starts with what the transfer pays for (`preselected`). */
	let paid = $state(untrack(() => preselected(reviewCase)));
	let busy = $state(false);

	const LOOKS: Record<ReviewKind, { label: () => string; icon: string; badge: string }> = {
		tooLow: { label: m.paymentCaseTooLow, icon: 'ph-arrow-down', badge: 'badge-warning' },
		tooHigh: { label: m.paymentCaseTooHigh, icon: 'ph-arrow-up', badge: 'badge-warning' },
		alreadyReceived: { label: m.paymentCaseAlreadyReceived, icon: 'ph-copy', badge: 'badge-error' },
		flagged: { label: m.paymentCaseFlagged, icon: 'ph-magnifying-glass', badge: 'badge-info' }
	};
	const look = $derived(LOOKS[reviewCase.kind]);

	const longDate = (date: Date | string) =>
		new Date(date).toLocaleDateString(getLocale(), {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});

	const people = $derived(reviewCase.payments.flatMap((payment) => payment.paymentFor));
	const transfer = $derived(reviewCase.transfer);
	const payerParticipantId = $derived(reviewCase.payments[0]?.payerParticipantId);
	const references = $derived(reviewCase.payments.map((payment) => payment.id));
	const receivedBefore = $derived(
		reviewCase.payments.find((payment) => payment.recievedAt)?.recievedAt
	);

	/** Every write of a decision at once, reported as one toast. */
	async function decide(writes: () => Promise<unknown>[]) {
		if (busy) return;
		busy = true;
		try {
			const promise = Promise.all(writes());
			toast.promise(promise, genericPromiseToastMessages);
			await promise;
		} catch {
			// the toast reported it; the case stays for another try
		} finally {
			busy = false;
		}
	}

	const setStatus = (status: 'DONE' | 'PROBLEM' | 'PENDING', recievedAt?: Date) =>
		decide(() =>
			reviewCase.payments.map((payment) =>
				client.mutate.updatePaymentTransaction({
					__args: { id: payment.id, assignedStatus: status, recievedAt },
					recievedAt: true
				})
			)
		);

	/** Marks the ticked people paid, on the transfer's booking day (`paidDecisions`). */
	const markPaid = () => {
		const recievedAt = transfer ? new Date(transfer.bookedAt) : new Date();
		return decide(() =>
			paidDecisions({ payments: reviewCase.payments, paid }).map((decision) =>
				decision.kind === 'partly'
					? client.mutate.receivePaymentFor({
							__args: { id: decision.paymentId, paidFor: decision.paidFor, recievedAt },
							recievedAt: true
						})
					: client.mutate.updatePaymentTransaction({
							__args: {
								id: decision.paymentId,
								assignedStatus: decision.kind === 'received' ? 'DONE' : 'PENDING',
								recievedAt: decision.kind === 'received' ? recievedAt : undefined
							},
							recievedAt: true
						})
			)
		);
	};
</script>

<article
	aria-labelledby="{id}-title"
	class="flex flex-col rounded-box border border-base-300 bg-base-100"
	data-testid="payment-review-case"
>
	<header
		class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-base-300 px-4 py-3 sm:px-5"
	>
		<span class="badge badge-soft gap-1.5 {look.badge}">
			<i aria-hidden="true" class="ph-duotone {look.icon}"></i>
			{look.label()}
		</span>
		<h3 id="{id}-title" class="flex flex-col font-mono text-lg font-bold">
			{#each references as reference (reference)}
				<span class="break-all">{reference}</span>
			{/each}
		</h3>
		<span class="text-sm text-base-content/60 sm:ml-auto">
			{m.paymentCasePosition({ position, total })}
			{#if transfer}·&nbsp;{m.paymentCaseBooked({ date: longDate(transfer.bookedAt) })}{/if}
		</span>
	</header>

	<div class="grid grid-cols-1 gap-6 p-4 sm:p-5 lg:grid-cols-2">
		<div class="flex min-w-0 flex-col gap-4">
			<CaseTransfer {transfer} expected={reviewCase.expected} people={people.length} {currency} />

			{#if reviewCase.kind === 'alreadyReceived' && receivedBefore}
				<div role="note" class="alert alert-soft alert-error text-sm">
					<i aria-hidden="true" class="ph-duotone ph-copy text-xl"></i>
					{m.paymentCaseAlreadyReceivedOn({ date: longDate(receivedBefore) })}
				</div>
			{/if}

			<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm">
				{#each references as reference (reference)}
					<a
						class="link"
						href={resolve(
							`dashboard/${conferenceId}/team/payments?searchValue=${encodeURIComponent(reference)}#reference-lookup`
						)}
					>
						{m.paymentCaseLookup()}: <span class="font-mono">{reference}</span>
					</a>
				{/each}
			</div>
		</div>

		<CasePeople
			{people}
			bind:paid
			selectable={reviewCase.kind !== 'alreadyReceived'}
			disabled={busy}
		/>
	</div>

	<footer class="flex flex-wrap items-center gap-2 border-t border-base-300 px-4 py-3 sm:px-5">
		{#if reviewCase.kind === 'alreadyReceived'}
			<button class="btn btn-error" disabled={busy} onclick={() => setStatus('PROBLEM')}>
				<i aria-hidden="true" class="ph-duotone ph-warning"></i>
				{m.paymentCaseRefund()}
			</button>
			<button class="btn btn-outline" disabled={busy} onclick={() => setStatus('DONE')}>
				<i aria-hidden="true" class="ph-duotone ph-check"></i>
				{m.paymentCaseKeep()}
			</button>
		{:else}
			<button class="btn btn-primary" disabled={busy || paid.length === 0} onclick={markPaid}>
				<i aria-hidden="true" class="ph-duotone ph-check"></i>
				{m.paymentCaseMarkPaid({ count: paid.length })}
			</button>
			<button
				class="btn btn-outline btn-error"
				disabled={busy}
				onclick={() => setStatus('PROBLEM')}
			>
				<i aria-hidden="true" class="ph-duotone ph-warning"></i>
				{m.markAsProblem()}
			</button>
		{/if}
		{#if payerParticipantId}
			<div class="sm:ml-auto">
				<WriteToDelegateButton
					{conferenceId}
					participantId={payerParticipantId}
					label={m.paymentCaseMessagePayer()}
				/>
			</div>
		{/if}
	</footer>
</article>
