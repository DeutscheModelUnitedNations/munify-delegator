<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	// @ts-expect-error - This library has no types
	import { girocode } from '@dipser/epc-qr-code.js';

	interface Props {
		name: string;
		iban: string;
		amount: string;
		currency: string;
		reason: string;
	}

	let { name, iban, amount, currency, reason }: Props = $props();

	let qrCode = $state<string>();

	$effect(() => {
		qrCode = girocode({
			name,
			iban,
			amount,
			currency,
			reason
		}).svg_data_url();
	});
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl font-bold">{m.giroCode()}</h1>
	<p>{m.giroCodeDescription()}</p>
	<div
		class="flex aspect-square w-full items-center justify-center rounded-lg bg-white p-10 sm:max-w-sm"
	>
		{#if qrCode && qrCode !== ''}
			<img src={qrCode} alt="QR Code" class="w-full" />
		{:else if qrCode === ''}
			<i class="fa-duotone fa-bug text-3xl"></i>
		{:else}
			<i class="fa-duotone fa-spinner fa-spin text-3xl"></i>
		{/if}
	</div>
</div>
