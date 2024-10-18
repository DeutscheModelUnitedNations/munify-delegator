<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';

	interface Props {
		name: string;
		label: string;
		placeholder?: string;
		form: SuperForm<A, B>;
	}

	let { form, label, name, placeholder }: Props = $props();
	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived(($formErrors as any)[name]);
	let constraints = $derived(($formConstraints as any)[name]);
	$inspect(errors);
</script>

<label for={name} class="form-control w-full">
	<span class="label-text mb-2">{label}</span>
	<input
		{placeholder}
		type="text"
		class="input input-bordered mb-1"
		{name}
		bind:value={$formData[name]}
		aria-invalid={errors ? 'true' : undefined}
		{...constraints}
	/>

	<FormFieldErrors {errors} />
</label>

<!-- {initialValue !== stateValue && 'input-success border-4'} -->
