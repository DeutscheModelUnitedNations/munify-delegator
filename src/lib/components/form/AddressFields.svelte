<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import type { FormPath, SuperForm } from 'sveltekit-superforms';
	import type { AddressFieldNames, AddressRules } from '#lib/helpers/addressRules.js';
	import { translatedNationCodeAddressFormOptions } from '#lib/utils/nationTranslationHelper.svelte.js';
	import { m } from '#lib/paraglide/messages.js';
	import AddressRegionField from './AddressRegionField.svelte';
	import FormSelect from './FormSelect.svelte';
	import FormTextInput from './FormTextInput.svelte';

	/**
	 * The postal address fields of a form, laid out as an address section. `fields` names the form's
	 * fields (`ADDRESS_FIELDS` where they are called as usual); `rules` comes from
	 * `addressRules(country)` and decides which of postal code, city and region the country uses.
	 */
	interface Props {
		form: SuperForm<A, B>;
		fields: AddressFieldNames<N>;
		rules: AddressRules;
		disabled?: boolean;
	}

	let { form, fields, rules, disabled = false }: Props = $props();
</script>

<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-[2fr_1fr]">
	<FormTextInput
		{form}
		name={fields.street}
		label={m.street()}
		placeholder={m.street()}
		{disabled}
	/>
	<FormTextInput
		{form}
		name={fields.apartment}
		label={m.streetAddition()}
		placeholder={m.streetAddition()}
		{disabled}
	/>
</div>
<FormSelect
	{form}
	name={fields.country}
	label={m.country()}
	placeholder={m.pleaseSelectCountry()}
	options={translatedNationCodeAddressFormOptions}
	{disabled}
/>
<div class="grid grid-cols-1 gap-x-4 sm:grid-cols-[1fr_2fr]">
	{#if rules.zip}
		<FormTextInput
			{form}
			name={fields.zip}
			label={m.zipCode()}
			placeholder={m.zipCode()}
			{disabled}
		/>
	{/if}
	{#if rules.city}
		<FormTextInput {form} name={fields.city} label={m.city()} placeholder={m.city()} {disabled} />
	{/if}
</div>
<AddressRegionField {form} name={fields.region} {rules} {disabled} />
