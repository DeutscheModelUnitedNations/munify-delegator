<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { type SuperForm, fileProxy, filesProxy } from 'sveltekit-superforms';
	import FormFieldErrors from './FormFieldErrors.svelte';

	interface Props {
		name: string;
		label: string;
		form: SuperForm<A, B>;
		accept?: string;
		multiple?: boolean;
	}

	let { form, label, name, accept, multiple }: Props = $props();
	let { constraints: formConstraints, errors: formErrors } = form;
	let errors = $derived(($formErrors as any)[name]);
	let constraints = $derived(($formConstraints as any)[name]);

	const file = multiple ? filesProxy(form, name as any) : fileProxy(form, name as any);
</script>

<label for={name} class="form-control w-full">
	<span class="label-text">{label}</span>
	<input
		type="file"
		class="file-input file-input-bordered"
		{multiple}
		{accept}
		{name}
		bind:files={$file}
		aria-invalid={errors ? 'true' : undefined}
		{...constraints}
	/>
	<FormFieldErrors {errors} />
</label>
