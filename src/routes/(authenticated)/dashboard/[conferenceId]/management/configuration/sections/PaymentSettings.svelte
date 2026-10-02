<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import FormFieldset from '$lib/components/form/FormFieldset.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import type { ConferenceSettings } from '../form-schema';

	let { form }: { form: SuperForm<ConferenceSettings> } = $props();
</script>

<div class="alert alert-info mb-6">
	<i class="fas fa-circle-info"></i>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
	<span>{@html m.tabExplanationPayments()}</span>
</div>

<FormFieldset title={m.bankingInformation()}>
	<FormTextInput {form} name="feeAmount" placeholder="75,00" label={m.fee()} type="number" />
	<FormTextInput {form} name="bankName" placeholder="Bank Name" label={m.bankName()} />
	<FormTextInput {form} name="iban" placeholder="DE12345678901234567890" label={m.iban()} />
	<FormTextInput {form} name="bic" placeholder="ABCDEFGH" label={m.bic()} />
	<FormTextInput
		{form}
		name="accountHolder"
		placeholder="Max Mustermann"
		label={m.accountHolder()}
	/>
	<FormTextInput {form} name="currency" placeholder="EUR" label={m.currency()} />
</FormFieldset>
