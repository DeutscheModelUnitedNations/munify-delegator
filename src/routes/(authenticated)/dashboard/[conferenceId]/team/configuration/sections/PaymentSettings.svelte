<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import FormSection from '$lib/components/form/FormSection.svelte';
	import FormTextInput from '$lib/components/form/FormTextInput.svelte';
	import type { ConferenceSettings } from '../form-schema';

	let { form }: { form: SuperForm<ConferenceSettings> } = $props();
</script>

<FormSection title={m.conferenceFeeSection()} icon="coins">
	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
		<FormTextInput {form} name="feeAmount" placeholder="75,00" label={m.fee()} type="number" />
		<FormTextInput {form} name="currency" placeholder="EUR" label={m.currency()} />
	</div>
</FormSection>
<FormSection title={m.conferenceBankAccount()} icon="building-columns">
	<FormTextInput
		{form}
		name="accountHolder"
		placeholder="Max Mustermann"
		label={m.accountHolder()}
	/>
	<FormTextInput {form} name="bankName" placeholder="Bank Name" label={m.bankName()} />
	<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-[2fr_1fr]">
		<FormTextInput {form} name="iban" placeholder="DE12345678901234567890" label={m.iban()} />
		<FormTextInput {form} name="bic" placeholder="ABCDEFGH" label={m.bic()} />
	</div>
</FormSection>
