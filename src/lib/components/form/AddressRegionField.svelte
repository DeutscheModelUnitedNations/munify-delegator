<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import type { FormPath, SuperForm } from 'sveltekit-superforms';
	import type { AddressRules } from '$lib/helpers/addressRules';
	import { m } from '$lib/paraglide/messages';
	import FormSelect from './FormSelect.svelte';
	import FormTextInput from './FormTextInput.svelte';

	/**
	 * The state, province or prefecture of an address, for the countries whose addresses have one:
	 * a choice where the country's regions are known, free text otherwise, and nothing at all for
	 * countries without (Germany among them). `rules` comes from `addressRules(country)`.
	 */
	interface Props {
		form: SuperForm<A, B>;
		name: N;
		rules: AddressRules;
		disabled?: boolean;
	}

	let { form, name, rules, disabled = false }: Props = $props();
</script>

{#if rules.region && rules.regions.length > 0}
	<FormSelect
		{form}
		{name}
		label={m.region()}
		placeholder={m.pleaseSelect()}
		options={rules.regions}
		{disabled}
	/>
{:else if rules.region}
	<FormTextInput {form} {name} label={m.region()} placeholder={m.region()} {disabled} />
{/if}
