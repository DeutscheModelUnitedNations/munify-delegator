<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { userPaymentTransactionsQuery } from '$lib/queries/userPaymentTransactionsQuery';
	import { goto } from '$app/navigation';

	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	let paymentRefs = $state<
		Array<{ id: string; amount: number; recievedAt: string | null; currency: string }>
	>([]);
	let loading = $state(false);

	$effect(() => {
		if (!userId || !conferenceId) return;

		loading = true;

		userPaymentTransactionsQuery
			.fetch({ variables: { userId, conferenceId } })
			.then((result) => {
				paymentRefs = (result.data?.findManyPaymentTransactions ?? []).map((tx) => ({
					id: tx.id,
					amount: tx.amount,
					recievedAt: tx.recievedAt,
					currency: tx.conference.currency
				}));
			})
			.finally(() => (loading = false));
	});
</script>

<div class="card bg-base-100 flex flex-col gap-2 p-4 shadow-md">
	<h3 class="font-bold">
		<i class="fa-duotone fa-money-bill-transfer mr-2"></i>
		{m.paymentReferences()}
	</h3>

	{#if loading}
		<span class="loading loading-spinner loading-sm"></span>
	{:else if paymentRefs.length === 0}
		<div class="alert alert-warning">
			<i class="fa-duotone fa-triangle-exclamation"></i>
			<span>{m.noPaymentReferences()}</span>
		</div>
	{:else}
		<div class="flex flex-col gap-2">
			{#each paymentRefs as ref (ref.id)}
				<div class="bg-base-200 flex items-center justify-between rounded-lg px-4 py-2">
					<div class="flex items-center gap-3">
						{#if ref.recievedAt}
							<i class="fa-duotone fa-circle-check text-success"></i>
							<span class="font-mono text-sm">{ref.id}</span>
							<p>
								{m.commandPalettePaymentReceived({
									amount: ref.amount,
									currency: ref.currency,
									date: new Date(ref.recievedAt).toLocaleDateString(undefined, {
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})
								})}
							</p>
						{:else}
							<i class="fa-duotone fa-circle-xmark text-error"></i>
							<span class="font-mono text-sm">{ref.id}</span>
							<p>
								{m.commandPalettePaymentNotReceived({
									amount: ref.amount,
									currency: ref.currency
								})}
							</p>
						{/if}
						<button
							class="btn btn-ghost btn-xs btn-square"
							onclick={() => goto(`/management/${conferenceId}/payments?searchValue=${ref.id}`)}
							title={m.payment()}
						>
							<i class="fa-duotone fa-money-bill-transfer"></i>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
