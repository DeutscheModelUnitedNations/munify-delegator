<!--
	@component
	The payments the bank payment sync settled by itself, newest first, a page at a time. Fetched
	only while the section is open: nobody has to look at them, they are there to check.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime';
	import formatNames from '#lib/helpers/formatNames';
	import { asCount } from '#lib/api/queryHelpers';

	interface Props {
		conferenceId: string;
		currency: string;
	}

	let { conferenceId, currency }: Props = $props();

	const PAGE = 25;
	let limit = $state(PAGE);

	const where = $derived({
		result: 'RECEIVED' as const,
		paymentTransaction: { conference: { id: { eq: conferenceId } } }
	});

	const [transfers, count] = $derived(
		await Promise.all([
			client.liveQuery.bankTransfers({
				__args: { where, orderBy: { bookedAt: 'desc' }, limit },
				externalId: true,
				amount: true,
				bookedAt: true,
				paymentTransactionId: true
			}),
			client.liveQuery.bankTransfersCount({ __args: { where } })
		])
	);

	const paymentIds = $derived(transfers.map((transfer) => transfer.paymentTransactionId));

	// read on their own: a person participant care may not see leaves a gap, not a failed query
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
					paymentTransactionsReferences: {
						__args: { where: { paymentTransactionId: { in: paymentIds } } },
						paymentTransactionId: true
					}
				})
	);

	/** The names of the people each payment covers, as far as the caller may read them. */
	const coveredNames = $derived.by(() => {
		const names = new Map<string, string[]>();
		for (const user of users) {
			const name = formatNames({
				givenName: user.givenName ?? undefined,
				familyName: user.familyName ?? undefined
			});
			for (const { paymentTransactionId } of user.paymentTransactionsReferences) {
				names.set(paymentTransactionId, [...(names.get(paymentTransactionId) ?? []), name]);
			}
		}
		return names;
	});
</script>

{#if transfers.length === 0}
	<p class="py-4 text-center text-base-content/60">{m.paymentsAutoEmpty()}</p>
{:else}
	<div class="overflow-x-auto">
		<table class="table table-sm">
			<thead>
				<tr>
					<th scope="col" aria-sort="descending">{m.paymentsAutoBooked()}</th>
					<th scope="col">{m.paymentsAutoReference()}</th>
					<th scope="col">{m.paymentsAutoCovered()}</th>
					<th scope="col" class="text-right">{m.paymentsAutoAmount()}</th>
					<th scope="col">{m.paymentCaseTransfer()}</th>
				</tr>
			</thead>
			<tbody>
				{#each transfers as transfer (transfer.id)}
					<tr>
						<td class="whitespace-nowrap">
							{new Date(transfer.bookedAt).toLocaleDateString(getLocale())}
						</td>
						<td class="whitespace-nowrap">
							<a
								class="link font-mono font-bold"
								href={resolve(
									`dashboard/${conferenceId}/team/payments?searchValue=${encodeURIComponent(transfer.paymentTransactionId)}#reference-lookup`
								)}
							>
								{transfer.paymentTransactionId}
							</a>
						</td>
						<td class="min-w-48">{coveredNames.get(transfer.paymentTransactionId)?.join(', ')}</td>
						<td class="text-right font-mono whitespace-nowrap">
							{transfer.amount.toLocaleString(getLocale(), { style: 'currency', currency })}
						</td>
						<td class="text-base-content/60">{transfer.externalId}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	{#if asCount(count) > transfers.length}
		<button type="button" class="btn self-start btn-outline btn-sm" onclick={() => (limit += PAGE)}>
			{m.paymentsAutoMore()}
		</button>
	{/if}
{/if}
