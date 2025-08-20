<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';

	interface Props {
		name: string;
		label?: string;
		description?: string;
		placeholder?: string;
		form: SuperForm<A, B>;
	}

	let { form, label, name, placeholder, description }: Props = $props();
	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived(($formErrors as any)[name]);
	let constraints = $derived(($formConstraints as any)[name]);
</script>

<label for={name} class="form-control w-full">
	{#if label}
		<span class="label-text mb-2">{label}</span>
	{/if}
	{#if description}
		<span class="label-text mb-2 max-w-[50ch] text-xs">
			{description}
		</span>
	{/if}
	<textarea
		{placeholder}
		type="text"
		class="textarea textarea-bordered"
		{name}
		id={name}
		bind:value={$formData[name]}
		aria-invalid={errors ? 'true' : undefined}
		{...constraints}
	></textarea>

	<FormFieldErrors {errors} />
</label>

<!-- {initialValue !== stateValue && 'input-success border-4'} -->
