<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import FormLabel from './FormLabel.svelte';
	import FormDescription from './FormDescription.svelte';
	import FormConstraints from './FormConstraints.svelte';

	interface Props {
		name: string;
		label?: string;
		description?: string;
		placeholder?: string;
		form: SuperForm<A, B>;
		type?: string;
		disabled?: boolean;
	}

	let {
		form,
		label,
		description,
		name,
		placeholder,
		type = 'text',
		disabled = false
	}: Props = $props();
	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived($formErrors[name]);
	let constraints = $derived($formConstraints[name]);
</script>

<label for={name} class="flex w-full flex-col text-left">
	<FormLabel {label} />
	<FormDescription {description} />
	<input
		{placeholder}
		{type}
		class="input disabled:bg-base-300 validator w-full"
		{name}
		id={name}
		bind:value={$formData[name]}
		aria-invalid={errors ? 'true' : undefined}
		{disabled}
		{...constraints}
	/>
	<FormConstraints {form} {name} />
	<FormFieldErrors {errors} />
</label>

<!-- {initialValue !== stateValue && 'input-success border-4'} -->
