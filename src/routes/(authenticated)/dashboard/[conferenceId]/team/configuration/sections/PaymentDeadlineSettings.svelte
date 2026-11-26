<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { SuperForm } from 'sveltekit-superforms';
	import FormSection from '#lib/components/form/FormSection.svelte';
	import FormDateTimeInput from '#lib/components/form/FormDateTimeInput.svelte';
	import type { ConferenceSettings } from '../form-schema';

	/**
	 * The payment deadline, apart from fee and bank account: participant care keeps it too, like the
	 * switch that opens payments.
	 */
	let { form }: { form: SuperForm<ConferenceSettings> } = $props();
</script>

<FormSection title={m.paymentDeadline()} icon="calendar-check">
	<FormDateTimeInput
		{form}
		name="paymentDeadline"
		label={m.paymentDeadline()}
		description={m.paymentDeadlineDescription()}
		enableTime
	/>
</FormSection>
