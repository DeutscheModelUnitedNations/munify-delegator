<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { logger } from '#lib/logger';
	import { client } from '#lib/api/rumbleClient/client';
	import { hasErrorCode } from '#lib/api/errorCodes';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { formatMoney } from '#lib/helpers/paymentFormat';
	import PayerNames from './PayerNames.svelte';
	import type { PayableUser } from './participantSelection.svelte.js';

	/**
	 * The last look before the reference is made: whom it covers and what that comes to. Making it
	 * settles both, so the step says so.
	 */
	interface Props {
		users: PayableUser[];
		ownUserId: string;
		conferenceId: string;
		feeAmount: number;
		currency: string;
	}

	let { users, ownUserId, conferenceId, feeAmount, currency }: Props = $props();

	let creating = $state(false);

	const money = (amount: number) => formatMoney({ amount, currency, locale: getLocale() });

	async function createReference() {
		creating = true;
		try {
			// The page follows the payment as it appears (live), nothing to hand back
			await client.mutate.createPaymentTransaction({
				__args: { conferenceId, userId: ownUserId, paymentFor: users.map((user) => user.id) },
				id: true
			});
			toast.success(m.referenceGeneratedSuccessfully());
		} catch (error) {
			logger.error('Creating the payment reference failed', error);
			// Somebody in the selection was marked paid since the page loaded
			toast.error(
				hasErrorCode({ err: error, code: 'CONFLICT' })
					? m.paymentAlreadyPaid()
					: m.genericToastError()
			);
		} finally {
			creating = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<PayerNames {users} />

	<table class="table max-w-md">
		<tbody>
			<tr>
				<td>{m.paymentFeePerPerson()}</td>
				<td class="text-right tabular-nums">{money(feeAmount)}</td>
			</tr>
			<tr>
				<td>{m.paymentPeopleCount()}</td>
				<td class="text-right tabular-nums">{users.length}</td>
			</tr>
			<tr>
				<th>{m.paymentToTransfer()}</th>
				<td class="text-primary text-right text-xl font-bold tabular-nums">
					{money(feeAmount * users.length)}
				</td>
			</tr>
		</tbody>
	</table>

	<div role="note" class="alert alert-warning alert-soft">
		<i aria-hidden="true" class="ph-duotone ph-warning text-2xl"></i>
		<span>{m.paymentReferenceSettles()}</span>
	</div>

	<button
		type="button"
		class="btn btn-primary self-end"
		disabled={creating || users.length === 0}
		onclick={createReference}
	>
		<i aria-hidden="true" class="ph-fill {creating ? 'ph-spinner-gap animate-spin' : 'ph-sparkle'}"
		></i>
		{m.generateReference()}
	</button>
</div>
