<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import type { PaymentParticipantSelection } from './participantSelection.svelte';

	/**
	 * Who a payment covers: the caller alone, or - switched on - anyone they may pay for, picked from
	 * the given fieldsets of people.
	 */
	interface Props {
		selection: PaymentParticipantSelection;
		payForOthers: boolean;
		/** Off for someone who may not pay for themselves: then there is nobody else to pay for. */
		canPayForSelf: boolean;
		onPayForOthersChange: (payForOthers: boolean) => void;
		children: Snippet;
	}

	let { selection, payForOthers, canPayForSelf, onPayForOthersChange, children }: Props = $props();
</script>

<div class="bg-base-200 flex w-full flex-col gap-4 rounded-box p-4 shadow-lg">
	<h2 class="text-2xl font-bold">
		<i class="fa-sharp-duotone fa-solid fa-list-check mr-4"></i>
		{m.paymentWhoTitle()}
	</h2>

	<label class="flex cursor-pointer items-start gap-3">
		<input
			type="checkbox"
			class="toggle toggle-primary mt-0.5"
			checked={payForOthers}
			disabled={!canPayForSelf || selection.isReferenceCreated}
			onchange={(e) => onPayForOthersChange(e.currentTarget.checked)}
		/>
		<span class="flex flex-col">
			<span class="font-semibold">{m.payForOthers()}</span>
			<span class="text-base-content/70 text-sm">{m.payForOthersDescription()}</span>
		</span>
	</label>

	{#if payForOthers}
		<div class="join join-horizontal">
			<button
				class="btn btn-sm join-item"
				onclick={() => selection.selectAll()}
				disabled={selection.isReferenceCreated}
			>
				<i class="fa-sharp-duotone fa-solid fa-check-double"></i>
				{m.selectAll()}
			</button>
			<button
				class="btn btn-sm join-item"
				onclick={() => selection.clear()}
				disabled={selection.isReferenceCreated}
			>
				<i class="fa-sharp-duotone fa-solid fa-xmark"></i>
				{m.deselectAll()}
			</button>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			{@render children()}
		</div>

		<div class="alert alert-info">
			<i class="fa-sharp-duotone fa-solid fa-info-circle mr-2 text-2xl"></i>
			<div>
				<h3 class="font-bold">{m.participantsNotFoundTitle()}</h3>
				<p>
					{m.participantsNotFoundDescription()}
				</p>
			</div>
		</div>
	{/if}
</div>
