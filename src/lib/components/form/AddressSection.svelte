<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import type { FormPath, SuperForm } from 'sveltekit-superforms';
	import type { AddressFieldNames, AddressRules } from '#lib/helpers/addressRules';
	import { m } from '#lib/paraglide/messages';
	import AddressFields from './AddressFields.svelte';
	import FormSection from './FormSection.svelte';

	/** `AddressFields` in a form section of its own, titled "Address". */
	interface Props {
		form: SuperForm<A, B>;
		fields: AddressFieldNames<N>;
		rules: AddressRules;
	}

	let { form, fields, rules }: Props = $props();
</script>

<FormSection title={m.address()} icon="house">
	<AddressFields {form} {fields} {rules} />
</FormSection>
