<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { girocode } from '@dipser/epc-qr-code.js';

	interface Props {
		name: string;
		iban: string;
		amount: string;
		currency: string;
		reason: string;
	}

	let { name, iban, amount, currency, reason }: Props = $props();

	let qrCode = $derived(
		girocode({
			name,
			iban,
			amount,
			currency,
			reason
		}).svg_data_url()
	);
</script>

<div class="flex w-full max-w-xs flex-col gap-2">
	<h3 class="font-bold">{m.giroCode()}</h3>
	<p class="text-base-content/70 text-sm">{m.giroCodeDescription()}</p>
	<div class="flex aspect-square w-full items-center justify-center rounded-box bg-white p-6">
		{#if qrCode && qrCode !== ''}
			<img src={qrCode} alt={m.a11yQrCode()} class="w-full" />
		{:else if qrCode === ''}
			<i class="fa-sharp-duotone fa-solid fa-bug text-3xl"></i>
		{:else}
			<i class="fa-sharp-duotone fa-solid fa-spinner fa-spin text-3xl"></i>
		{/if}
	</div>
</div>
