<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm, fileProxy, filesProxy } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import FormLabel from './FormLabel.svelte';
	import FormDescription from './FormDescription.svelte';

	interface Props {
		name: string;
		label: string;
		description: string;
		form: SuperForm<A, B>;
		accept?: string;
		multiple?: boolean;
		inputClass?: string;
	}

	let { form, label, description, name, accept, multiple, inputClass = '' }: Props = $props();
	let { constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived($formErrors[name]);
	let constraints = $derived($formConstraints[name]);

	const file = multiple ? filesProxy(form, name as any) : fileProxy(form, name as any);
</script>

<label for={name} class="flex w-full flex-col gap-1">
	<FormLabel {label} />
	<FormDescription {description} />
	<input
		type="file"
		class="file-input {inputClass} validator w-full"
		{multiple}
		{accept}
		{name}
		bind:files={$file}
		aria-invalid={errors ? 'true' : undefined}
		{...constraints}
	/>
	<FormFieldErrors {errors} />
</label>
