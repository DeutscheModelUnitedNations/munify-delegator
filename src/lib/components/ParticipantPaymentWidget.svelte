<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { resolve } from '$app/paths';
	import formatNames from '#lib/helpers/formatNames';
	import Row from './userCard/ui/Row.svelte';

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

	const formatAmount = (transaction: (typeof transactions)[number]) =>
		transaction.amount.toLocaleString(getLocale(), {
			style: 'currency',
			currency: transaction.conference.currency ?? 'EUR'
		});

	const nameOf = (user: { givenName: string; familyName: string }) =>
		formatNames({
			givenName: user.givenName,
			familyName: user.familyName,
			options: {
				givenNameUppercase: false,
				familyNameUppercase: false
			}
		});
</script>

{#each transactions as transaction (transaction.id)}
	{@const amount = formatAmount(transaction)}
	{@const others = transaction.paymentFor.filter((covered) => covered.user.id !== userId)}
	<Row
		icon={transaction.recievedAt ? 'check-circle' : 'hourglass-medium'}
		tone={transaction.recievedAt ? 'success' : 'warning'}
		title={m.paymentReference()}
	>
		<span class="font-mono">{transaction.id}</span>
		<span class="text-base-content/70 block">
			{transaction.recievedAt
				? m.paymentReferenceReceived({
						amount,
						date: new Date(transaction.recievedAt).toLocaleDateString(getLocale(), {
							dateStyle: 'medium'
						})
					})
				: m.paymentReferencePending({ amount })}
		</span>
		<!-- Who else the payment concerns: whoever paid for the person, or whom they paid for -->
		{#if transaction.user.id !== userId}
			<span class="text-base-content/60 block text-xs">
				{m.paymentPaidBy({ name: nameOf(transaction.user) })}
			</span>
		{:else if others.length > 0}
			<span class="text-base-content/60 block text-xs">
				{m.paymentAlsoCovers({ names: others.map((covered) => nameOf(covered.user)).join(', ') })}
			</span>
		{/if}
		{#snippet actions()}
			<a
				class="btn btn-ghost btn-sm text-primary"
				href={resolve(
					`/(authenticated)/dashboard/[conferenceId]/team/payments?searchValue=${transaction.id}`,
					{ conferenceId }
				)}
			>
				<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
				{m.paymentReferenceOpen()}
			</a>
		{/snippet}
	</Row>
{/each}
