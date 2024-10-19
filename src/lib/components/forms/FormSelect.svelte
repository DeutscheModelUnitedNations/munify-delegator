<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';

	interface Props {
		name: string;
		label?: string;
		placeholder?: string;
		form: SuperForm<A, B>;
		options: { value: string; label: string }[];
	}

	let { form, label, name, placeholder, options }: Props = $props();
	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived(($formErrors as any)[name]);
	let constraints = $derived(($formConstraints as any)[name]);
</script>

<label for={name} class="form-control w-full">
	{#if label}
		<span class="label-text mb-2">{label}</span>
	{/if}

	<select
		class="select select-bordered"
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
