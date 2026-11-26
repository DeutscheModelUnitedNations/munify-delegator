<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A, D extends FormPathLeaves<A, Date | undefined> & FormPath<A>"
>
	import type { FormPath, FormPathLeaves, SuperForm } from 'sveltekit-superforms';
	import { m } from '#lib/paraglide/messages';
	import FormDateTimeInput from './FormDateTimeInput.svelte';
	import FormSelect from './FormSelect.svelte';
	import FormTextInput from './FormTextInput.svelte';
	import {
		foodPreferenceOptions,
		genderOptions,
		type PERSONAL_INFORMATION_FIELDS
	} from './userFieldOptions';

	/**
	 * The fields about a person in a form (birthday, gender, pronouns, diet), for the caller to lay out
	 * (`PERSONAL_INFORMATION_FIELDS`).
	 */
	interface Props {
		form: SuperForm<A, B>;
		fields: Record<Exclude<keyof typeof PERSONAL_INFORMATION_FIELDS, 'birthday'>, N> & {
			birthday: D;
		};
	}

	let { form, fields }: Props = $props();
</script>

<FormDateTimeInput
	{form}
	name={fields.birthday}
	label={m.birthDate()}
	defaultYear={new Date(Date.now() - 13 * 365 * 24 * 60 * 60 * 1000).getFullYear()}
	enableFutureDates={false}
/>
<FormSelect {form} name={fields.gender} label={m.gender()} options={genderOptions()} />
<FormTextInput
	{form}
	name={fields.pronouns}
	label={m.pronouns()}
	placeholder={m.pronounsExample()}
/>
<FormSelect
	{form}
	name={fields.foodPreference}
	label={m.diet()}
	options={foodPreferenceOptions()}
/>
