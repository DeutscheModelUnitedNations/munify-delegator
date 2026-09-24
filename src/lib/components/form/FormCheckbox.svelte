<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';

	interface Props {
		name: string;
		label: string;
		form: SuperForm<A, B>;
		disabled?: boolean;
	}

	let { form, label, name, disabled }: Props = $props();
	let { form: formData, constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived(($formErrors as any)[name]);
	let constraints = $derived(($formConstraints as any)[name]);
</script>

<label for={name} class="flex w-full cursor-pointer items-center">
	<input
		type="checkbox"
		class="checkbox"
		{name}
		id={name}
		bind:checked={$formData[name]}
		aria-invalid={errors ? 'true' : undefined}
		{...constraints}
		{disabled}
	/>
	<span class="label ml-3 whitespace-break-spaces">{label}</span>
</label>
<FormFieldErrors {errors} />
