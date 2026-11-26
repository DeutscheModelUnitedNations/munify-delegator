<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import type { PaymentParticipantSelection } from './participantSelection.svelte';

	/**
	 * Who a payment covers: the caller alone, or - switched on - anyone they may pay for, picked from
	 * the given fieldsets of people. A step of the payment page, so it brings no card of its own.
	 */
	interface Props {
		selection: PaymentParticipantSelection;
		payForOthers: boolean;
		/** Off for someone who may not pay for themselves: then there is nobody else to pay for. */
		canPayForSelf: boolean;
		onPayForOthersChange: (payForOthers: boolean) => void;
		onConfirm: () => void;
		children: Snippet;
	}

	let { selection, payForOthers, canPayForSelf, onPayForOthersChange, onConfirm, children }: Props =
		$props();
</script>

<div class="flex flex-col gap-4">
	<label class="flex cursor-pointer items-start gap-3">
		<input
			type="checkbox"
			class="toggle toggle-primary mt-0.5"
			checked={payForOthers}
			disabled={!canPayForSelf}
			onchange={(e) => onPayForOthersChange(e.currentTarget.checked)}
		/>
		<span class="flex flex-col">
			<span class="font-semibold">{m.payForOthers()}</span>
			<span class="text-base-content/70 text-sm">{m.payForOthersDescription()}</span>
		</span>
	</label>

	{#if payForOthers}
		<div class="join join-horizontal">
			<button type="button" class="btn btn-sm join-item" onclick={() => selection.selectAll()}>
				<i aria-hidden="true" class="ph-duotone ph-checks"></i>
				{m.selectAll()}
			</button>
			<button type="button" class="btn btn-sm join-item" onclick={() => selection.clear()}>
				<i aria-hidden="true" class="ph-duotone ph-x"></i>
				{m.deselectAll()}
			</button>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			{@render children()}
		</div>

		<details class="bg-base-200 p-4">
			<summary class="cursor-pointer font-bold">{m.participantsNotFoundTitle()}</summary>
			<p class="mt-2">{m.participantsNotFoundDescription()}</p>
		</details>
	{/if}

	<div class="border-base-300 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
		<p>{m.paymentSelectedCount({ count: selection.selected.length })}</p>
		<button
			type="button"
			class="btn btn-primary"
			disabled={selection.selected.length === 0}
			onclick={onConfirm}
		>
			{m.next()}
			<i aria-hidden="true" class="ph-duotone ph-arrow-down"></i>
		</button>
	</div>
</div>
