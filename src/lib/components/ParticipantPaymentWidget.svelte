<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { resolve } from '$app/paths';
	import formatNames from '#lib/helpers/formatNames';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const person = { id: true, givenName: true, familyName: true } as const;

	// The payments covering the person, and those they made for others.
	const transactions = $derived(
		await client.liveQuery.paymentTransactions({
			__args: {
				where: {
					conference: { id: { eq: conferenceId } },
					OR: [{ user: { id: { eq: userId } } }, { paymentFor: { user: { id: { eq: userId } } } }]
				},
				orderBy: { createdAt: 'desc' }
			},
			id: true,
			amount: true,
			recievedAt: true,
			conference: { id: true, currency: true },
			user: person,
			paymentFor: { id: true, user: person }
		})
	);

	const nameOf = (user: { givenName: string; familyName: string }) =>
		formatNames(user.givenName, user.familyName, {
			givenNameUppercase: false,
			familyNameUppercase: false
		});
</script>

{#snippet transactionRow(transaction: (typeof transactions)[number])}
	{@const currency = transaction.conference.currency ?? 'EUR'}
	{@const others = transaction.paymentFor.filter((covered) => covered.user.id !== userId)}
	<div class="bg-base-100 flex flex-col gap-1 rounded-box px-3 py-2">
		<div class="flex flex-wrap items-center gap-3">
			{#if transaction.recievedAt}
				<i class="fa-sharp-duotone fa-solid fa-circle-check text-success"></i>
				<span class="font-mono text-sm">{transaction.id}</span>
				<p>
					{m.commandPalettePaymentReceived({
						amount: transaction.amount,
						currency,
						date: new Date(transaction.recievedAt).toLocaleDateString(getLocale(), {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})
					})}
				</p>
			{:else}
				<i class="fa-sharp-duotone fa-solid fa-circle-xmark text-error"></i>
				<span class="font-mono text-sm">{transaction.id}</span>
				<p>{m.commandPalettePaymentNotReceived({ amount: transaction.amount, currency })}</p>
			{/if}
			<a
				class="btn btn-ghost btn-xs btn-square"
				href={resolve(
					`/(authenticated)/dashboard/[conferenceId]/team/payments?searchValue=${transaction.id}`,
					{ conferenceId }
				)}
				title={m.payment()}
			>
				<i class="fa-sharp-duotone fa-solid fa-money-bill-transfer"></i>
			</a>
		</div>
		<!-- Who else the payment concerns: whoever paid for the person, or whom they paid for -->
		{#if transaction.user.id !== userId}
			<p class="text-base-content/70 text-xs">
				{m.paymentPaidBy({ name: nameOf(transaction.user) })}
			</p>
		{:else if others.length > 0}
			<p class="text-base-content/70 text-xs">
				{m.paymentAlsoCovers({ names: others.map((covered) => nameOf(covered.user)).join(', ') })}
			</p>
		{/if}
	</div>
{/snippet}

<div class="flex items-start gap-4 px-4 py-3">
	<i
		class="fa-sharp-duotone fa-solid fa-money-bill-transfer text-base-content/60 w-6 pt-0.5 text-center text-lg"
	></i>
	<div class="flex min-w-0 grow flex-col gap-2">
		<span class="font-semibold">{m.paymentReferences()}</span>
		{#if transactions.length === 0}
			<span class="text-warning text-sm">
				<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation mr-1"></i>
				{m.noPaymentReferences()}
			</span>
		{:else}
			{#each transactions as transaction (transaction.id)}
				{@render transactionRow(transaction)}
			{/each}
		{/if}
	</div>
</div>
