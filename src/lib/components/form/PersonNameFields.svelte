<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import type { FormPath, SuperForm } from 'sveltekit-superforms';
	import { m } from '#lib/paraglide/messages';
	import FormTextInput from './FormTextInput.svelte';
	import type { PERSON_NAME_FIELDS } from './userFieldOptions';

	/** The fields of a person's legal name in a form, for the caller to lay out (`PERSON_NAME_FIELDS`). */
	interface Props {
		form: SuperForm<A, B>;
		fields: Record<keyof typeof PERSON_NAME_FIELDS, N>;
	}

	let { form, fields }: Props = $props();
</script>

<FormTextInput {form} name={fields.givenName} label={m.firstName()} placeholder={m.firstName()} />
<FormTextInput {form} name={fields.familyName} label={m.lastName()} placeholder={m.lastName()} />
