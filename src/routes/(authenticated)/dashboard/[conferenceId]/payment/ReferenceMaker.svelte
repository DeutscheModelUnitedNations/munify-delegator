<script lang="ts">
	import { client } from '$lib/api/rumbleClient/client';
	import type { ConferencePaymentData } from './conferencePaymentData';
	import DisabledInput from '$lib/components/DisabledInput.svelte';
	import { m } from '$lib/paraglide/messages';
	import formatNames from '$lib/helpers/formatNames';
	import { toast } from 'svelte-sonner';
	import GiroCode from './GiroCode.svelte';

	interface Props {
		users: {
			id: string;
			givenName: string | null;
			familyName: string | null;
		}[];
		ownUserId: string;
		conferencePaymentData?: ConferencePaymentData;
		/** Called once a reference has been generated, so the parent can lock its selection. */
		onReferenceCreated?: () => void;
	}

	let { users, conferencePaymentData, ownUserId, onReferenceCreated }: Props = $props();

	let reference = $state<string>();
	let referenceLoading = $state(false);

	let paymentFor = $derived(users.map((x) => x.id));

	/** The total to transfer, or `undefined` while the conference has no fee set. */
	let totalAmount = $derived(
		conferencePaymentData?.feeAmount ? conferencePaymentData.feeAmount * users.length : undefined
	);
	let currency = $derived(conferencePaymentData?.currency);

	let transferDetails = $derived([
		{ label: m.accountHolder(), value: conferencePaymentData?.accountHolder ?? '' },
		{ label: m.iban(), value: conferencePaymentData?.iban ?? '' },
		{ label: m.bic(), value: conferencePaymentData?.bic ?? '' },
		{ label: m.bankName(), value: conferencePaymentData?.bankName ?? '' },
		{ label: `${m.amount()} (${currency})`, value: totalAmount?.toFixed(2) ?? '' }
	]);

	async function generateReference() {
		if (!conferencePaymentData) {
			console.error('No conference payment data found');
			return;
		}

		referenceLoading = true;
		try {
			const paymentTransaction = await client.mutate.createPaymentTransaction({
				__args: {
					conferenceId: conferencePaymentData.id,
					userId: ownUserId,
					paymentFor
				},
				id: true
			});

			reference = paymentTransaction.id;
			onReferenceCreated?.();
			toast.success(m.referenceGeneratedSuccessfully());
		} catch (error) {
			// Without this the button stays disabled on its spinner, with no hint anything failed.
			console.error(error);
			toast.error(m.genericToastError());
		} finally {
			referenceLoading = false;
		}
	}
</script>

{#snippet participantsToPayFor()}
	<p class="font-bold">{m.youPayForXParticipants({ numParticipants: users.length })}</p>
	<div class="mb-4 flex flex-wrap gap-1">
		{#each users as user (user.id)}
			<span class="badge badge-neutral"
				>{formatNames(user.givenName ?? undefined, user.familyName ?? undefined)}</span
			>
		{:else}
			<span class="italic">&mdash;</span>
		{/each}
	</div>

	<button
		class="btn btn-primary max-w-md {(referenceLoading || users.length == 0) && 'btn-disabled'}"
		onclick={generateReference}
	>
		<i class="fas {referenceLoading ? 'fa-spinner fa-spin' : 'fa-sparkles'} mr-2"
		></i>{m.generateReference()}
	</button>
{/snippet}

{#snippet transfer(reference: string)}
	<div class="mt-10 flex w-full flex-col items-start gap-14 xl:flex-row">
		<div class="grid w-full grid-cols-1 items-center justify-center gap-4 sm:grid-cols-[auto_1fr]">
			<div class="col-span-2 flex flex-col gap-4">
				<h2 class="text-2xl font-bold">{m.transactionDetails()}</h2>
				<p>{m.referenceMakerGeneratedDescription()}</p>
			</div>
			{#each transferDetails as detail (detail.label)}
				<h3 class="font-bold">{detail.label}:</h3>
				<DisabledInput value={detail.value} />
			{/each}

			<h3 class="font-bold">{m.reason()}:</h3>
			<DisabledInput value={reference} />
		</div>
		<GiroCode
			name={conferencePaymentData?.accountHolder ?? ''}
			iban={conferencePaymentData?.iban ?? ''}
			amount={(totalAmount ?? '').toString()}
			currency={currency ?? ''}
			reason={reference}
		/>
	</div>
{/snippet}

<div class="bg-base-200 mt-4 flex w-full flex-col gap-2 rounded-box p-4 shadow-lg">
	<h2 class="text-2xl font-bold">
		<i class="fa-sharp-duotone fa-solid fa-money-bill-transfer mr-4"></i>{m.referenceMaker()}
	</h2>
	<p>{m.referenceMakerDescription()}</p>
	{#if reference}
		{@render transfer(reference)}
	{:else}
		{@render participantsToPayFor()}
	{/if}
	<div class="alert alert-warning mt-8">
		<i class="fas fa-exclamation-triangle mr-2 text-3xl"></i>
		<div class="flex flex-col gap-2">
			<h3 class="font-bold">{m.abroadTransaction()}</h3>
			<p>
				{m.abroadTransactionWarning({ currency: currency ?? 'unknown' })}
			</p>
		</div>
	</div>
</div>
