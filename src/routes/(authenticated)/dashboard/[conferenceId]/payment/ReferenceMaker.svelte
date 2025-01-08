<script lang="ts">
	import { graphql, type PaymentLayoutQuery$result } from '$houdini';
	import DisabledInput from '$lib/components/DisabledInput.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import GiroCode from './GiroCode.svelte';

	interface Props {
		users: {
			id: string;
			given_name: string;
			family_name: string;
		}[];
		ownUserId: string;
		conferencePaymentData?: PaymentLayoutQuery$result['findUniqueConference'];
	}

	let { users, conferencePaymentData, ownUserId }: Props = $props();

	let reference = $state<string>();
	let referenceLoading = $state(false);

	let paymentFor = $derived(users.map((x) => x.id));

	const createPaymentTransaction = graphql(`
		mutation CreateOnePaymentTransactionMutation(
			$conferenceId: ID!
			$userId: ID!
			$paymentFor: [ID!]!
		) {
			createOnePaymentTransaction(
				conferenceId: $conferenceId
				userId: $userId
				paymentFor: $paymentFor
			) {
				id
			}
		}
	`);

	async function generateReference() {
		referenceLoading = true;

		if (!conferencePaymentData) {
			console.error('No conference payment data found');
			return;
		}

		const paymentTransaction = await createPaymentTransaction.mutate({
			conferenceId: conferencePaymentData?.id,
			userId: ownUserId,
			paymentFor: paymentFor
		});

		reference = paymentTransaction.data?.createOnePaymentTransaction.id;
		referenceLoading = false;
	}
</script>

<div class="mt-4 flex w-full flex-col gap-2 rounded-lg bg-base-200 p-4 shadow-lg">
	<h1 class="text-2xl font-bold">
		<i class="fa-duotone fa-money-bill-transfer mr-4"></i>{m.referenceMaker()}
	</h1>
	<p>{m.referenceMakerDescription()}</p>
	{#if !reference}
		<p class="font-bold">{m.youPayForXParticipants({ numParticipants: users.length })}</p>
		<div class="mb-4 flex flex-wrap gap-1">
			{#each users as user}
				<span class="badge badge-neutral">{user.given_name} {user.family_name}</span>
			{/each}
		</div>

		<button
			class="btn btn-primary max-w-md {referenceLoading && 'btn-disabled'}"
			onclick={generateReference}
		>
			<i class="fas {referenceLoading ? 'fa-spinner fa-spin' : 'fa-sparkles'} mr-2"
			></i>{m.generateReference()}
		</button>
	{:else}
		<div class="mt-10 flex w-full flex-col items-start gap-14 xl:flex-row">
			<div
				class="grid w-full grid-cols-1 items-center justify-center gap-4 sm:grid-cols-[auto,1fr]"
			>
				<div class="col-span-2 flex flex-col gap-4">
					<h2 class="text-2xl font-bold">{m.transactionDetails()}</h2>
					<p>{m.referenceMakerGeneratedDescription()}</p>
				</div>
				<h3 class="font-bold">{m.accountHolder()}:</h3>
				<DisabledInput value={conferencePaymentData?.accountHolder ?? ''} />

				<h3 class="font-bold">{m.iban()}:</h3>
				<DisabledInput value={conferencePaymentData?.iban ?? ''} />

				<h3 class="font-bold">{m.bic()}:</h3>
				<DisabledInput value={conferencePaymentData?.bic ?? ''} />

				<h3 class="font-bold">{m.bankName()}:</h3>
				<DisabledInput value={conferencePaymentData?.bankName ?? ''} />

				<h3 class="font-bold">{m.amount()} ({conferencePaymentData?.currency}):</h3>
				<DisabledInput
					value={conferencePaymentData?.feeAmount
						? (conferencePaymentData?.feeAmount * users.length).toFixed(2)
						: ''}
				/>

				<h3 class="font-bold">{m.reason()}:</h3>
				<DisabledInput value={reference} />
			</div>
			<GiroCode
				name={conferencePaymentData?.accountHolder ?? ''}
				iban={conferencePaymentData?.iban ?? ''}
				amount={(conferencePaymentData?.feeAmount
					? conferencePaymentData?.feeAmount * users.length
					: ''
				).toString()}
				currency={conferencePaymentData?.currency ?? ''}
				reason={reference}
			/>
		</div>
	{/if}
	<div class="alert alert-warning mt-8">
		<i class="fas fa-exclamation-triangle mr-2 text-3xl"></i>
		<div class="flex flex-col gap-2">
			<h3 class="font-bold">{m.abroadTransaction()}</h3>
			<p>
				{m.abroadTransactionWarning({ currency: conferencePaymentData?.currency ?? 'unknown' })}
			</p>
		</div>
	</div>
</div>
