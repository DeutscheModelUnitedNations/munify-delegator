<script lang="ts">
	import DisabledInput from '#lib/components/DisabledInput.svelte';
	import { m } from '#lib/paraglide/messages';
	import GiroCode from './GiroCode.svelte';
	import type { ConferencePaymentData } from './conferencePaymentData';

	/** What goes into the transfer: the reference first, the account, the amount, and the GiroCode. */
	interface Props {
		reference: string;
		amount: number;
		conferencePaymentData: ConferencePaymentData;
	}

	let { reference, amount, conferencePaymentData }: Props = $props();

	const currency = $derived(conferencePaymentData.currency ?? 'EUR');
	const details = $derived([
		{ label: `${m.amount()} (${currency})`, value: amount.toFixed(2) },
		{ label: m.accountHolder(), value: conferencePaymentData.bankAccountHolder ?? '' },
		{ label: m.iban(), value: conferencePaymentData.iban ?? '' },
		{ label: m.bic(), value: conferencePaymentData.bic ?? '' },
		{ label: m.bankName(), value: conferencePaymentData.bankName ?? '' }
	]);
</script>

<div class="flex flex-col gap-4">
	<p class="text-base-content/80">{m.referenceMakerGeneratedDescription()}</p>
	<div class="flex w-full flex-col items-start gap-8 lg:flex-row">
		<dl
			class="grid w-full max-w-2xl grid-cols-1 items-center gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]"
		>
			<dt class="text-primary font-bold">{m.reason()}</dt>
			<dd><DisabledInput value={reference} /></dd>
			{#each details as detail (detail.label)}
				<dt class="font-bold">{detail.label}</dt>
				<dd><DisabledInput value={detail.value} /></dd>
			{/each}
		</dl>
		<GiroCode
			name={conferencePaymentData.bankAccountHolder ?? ''}
			iban={conferencePaymentData.iban ?? ''}
			amount={amount.toString()}
			{currency}
			reason={reference}
		/>
	</div>
	<details class="bg-warning/10 p-4">
		<summary class="cursor-pointer font-bold">{m.abroadTransaction()}</summary>
		<p class="mt-2">{m.abroadTransactionWarning({ currency })}</p>
	</details>
</div>
