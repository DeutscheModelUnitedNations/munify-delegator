<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { formatMoney, paymentDeadlineState } from '#lib/helpers/paymentFormat';

	/** What the fee payment is about: how much, until when, how. */
	interface Props {
		feeAmount: number | null;
		currency: string;
		deadline: Date | null;
		onRead: () => void;
	}

	let { feeAmount, currency, deadline, onRead }: Props = $props();

	const deadlineState = $derived(paymentDeadlineState({ deadline, now: new Date() }));
</script>

<div class="flex flex-col gap-4">
	<p>{m.paymentInfoText()}</p>
	<p>{m.paymentInfoForOthers()}</p>

	<dl class="grid gap-3 sm:grid-cols-3">
		<div class="bg-base-200 flex flex-col gap-1 p-4">
			<dt class="text-sm">{m.paymentInfoFee()}</dt>
			<dd class="text-primary text-xl font-bold">
				{feeAmount === null
					? m.paymentInfoFeeUnknown()
					: formatMoney({ amount: feeAmount, currency, locale: getLocale() })}
			</dd>
		</div>
		{#if deadline}
			<div class="bg-base-200 flex flex-col gap-1 p-4">
				<dt class="text-sm">{m.paymentInfoDeadline()}</dt>
				<dd class="text-primary flex flex-wrap items-center gap-2 text-xl font-bold">
					{new Date(deadline).toLocaleDateString(getLocale(), { dateStyle: 'medium' })}
					{#if deadlineState === 'overdue'}
						<span class="badge badge-warning">{m.paymentDeadlineOverdue()}</span>
					{/if}
				</dd>
			</div>
		{/if}
		<div class="bg-base-200 flex flex-col gap-1 p-4">
			<dt class="text-sm">{m.paymentInfoMethod()}</dt>
			<dd class="text-primary text-xl font-bold">{m.paymentInfoMethodTransfer()}</dd>
		</div>
	</dl>

	<div role="note" class="alert alert-info">
		<i aria-hidden="true" class="ph-duotone ph-info text-2xl"></i>
		<span>{m.paymentInfoGuideNotice()}</span>
	</div>
</div>
<button type="button" class="btn btn-primary mt-4 self-end" onclick={onRead}>
	{m.next()}
	<i aria-hidden="true" class="ph-duotone ph-arrow-down"></i>
</button>
