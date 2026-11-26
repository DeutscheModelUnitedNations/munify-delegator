<!--
	@component
	What a review case's transfer brought against what its payments ask for, and how the bank names
	it: sender, purpose, transaction number.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import type { CaseTransfer } from './reviewCases';

	interface Props {
		transfer: CaseTransfer | undefined;
		expected: number;
		people: number;
		currency: string;
	}

	let { transfer, expected, people, currency }: Props = $props();

	const money = (amount: number) =>
		amount.toLocaleString(getLocale(), { style: 'currency', currency });
	const fee = $derived(expected / Math.max(people, 1));
	const difference = $derived(transfer ? transfer.amount - expected : 0);
</script>

{#if transfer}
	<dl class="grid grid-cols-3 gap-px overflow-hidden rounded-field bg-base-300">
		<div class="flex flex-col gap-1 bg-base-200 px-3 py-2">
			<dt class="text-xs text-base-content/60">{m.paymentCaseExpected()}</dt>
			<dd class="font-mono text-lg font-bold">{money(expected)}</dd>
			<dd class="text-xs text-base-content/60">
				{m.paymentCasePeopleCount({ count: people, fee: money(fee) })}
			</dd>
		</div>
		<div class="flex flex-col gap-1 bg-base-200 px-3 py-2">
			<dt class="text-xs text-base-content/60">{m.paymentCaseReceived()}</dt>
			<dd class="font-mono text-lg font-bold">{money(transfer.amount)}</dd>
		</div>
		<div class="flex flex-col gap-1 bg-base-200 px-3 py-2">
			<dt class="text-xs text-base-content/60">{m.paymentCaseDifference()}</dt>
			<dd class="font-mono text-lg font-bold">
				{difference > 0 ? '+' : ''}{money(difference)}
			</dd>
		</div>
	</dl>

	<dl class="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
		{#if transfer.counterparty}
			<div class="contents">
				<dt class="text-base-content/60 max-sm:mt-1">{m.paymentCaseSender()}</dt>
				<dd class="font-bold break-words">{transfer.counterparty}</dd>
			</div>
		{/if}
		{#if transfer.purpose}
			<div class="contents">
				<dt class="text-base-content/60 max-sm:mt-1">{m.paymentCasePurpose()}</dt>
				<dd class="font-mono [overflow-wrap:anywhere]">{transfer.purpose}</dd>
			</div>
		{/if}
		<div class="contents">
			<dt class="text-base-content/60 max-sm:mt-1">{m.paymentCaseTransfer()}</dt>
			<dd>{transfer.externalId}</dd>
		</div>
	</dl>
{:else}
	<p class="text-sm text-base-content/70">{m.paymentCaseNoTransfer()}</p>
{/if}
