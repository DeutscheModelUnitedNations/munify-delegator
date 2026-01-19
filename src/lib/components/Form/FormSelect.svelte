<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import FormLabel from './FormLabel.svelte';
	import FormDescription from './FormDescription.svelte';

	interface Props {
		name: string;
		label?: string;
		description?: string;
		placeholder?: string;
		form: SuperForm<A, B>;
		options: { value: string; label: string }[];
	}

	let { form, label, description, name, placeholder, options }: Props = $props();
	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived($formErrors[name]);
	let constraints = $derived($formConstraints[name]);
</script>

<label for={name} class="flex w-full flex-col">
	<FormLabel {label} />
	<FormDescription {description} />
	<select
		class="select select-bordered validator w-full"
		{placeholder}
		{name}
		id={name}
		bind:value={$formData[name]}
		aria-invalid={errors ? 'true' : undefined}
		{...constraints}
	>
		<option disabled selected={!$formData[name]} value={null}>{placeholder}</option>
		{#each options as option}
			<option value={option.value} selected={option.value === $formData[name]}
				>{option.label}</option
			>
		{/each}
	</select>

	<FormFieldErrors {errors} />
</label>
