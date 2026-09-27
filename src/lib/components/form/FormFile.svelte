<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPathLeaves<A, File> & FormPath<A>"
>
	import {
		type FormPath,
		type FormPathLeaves,
		type SuperForm,
		fileProxy
	} from 'sveltekit-superforms';
	import { Control, Field, Label } from 'formsnap';
	import FormDescription from './FormDescription.svelte';
	import FormFieldErrors from './FormFieldErrors.svelte';

	interface Props {
		name: N;
		label: string;
		description?: string;
		form: SuperForm<A, B>;
		accept?: string;
		inputClass?: string;
	}

	let { form, label, description, name, accept, inputClass = '' }: Props = $props();

	const file = fileProxy(form, name);
</script>

<Field {form} {name}>
	{#snippet children({ constraints })}
		<div class="flex w-full flex-col gap-1">
			<Control>
				{#snippet children({ props })}
					<Label class="label mb-2 whitespace-break-spaces">{label}</Label>
					<FormDescription {description} />
					<input
						{...props}
						type="file"
						class="file-input {inputClass} validator w-full"
						{accept}
						bind:files={$file}
						{...constraints}
					/>
				{/snippet}
			</Control>
			<FormFieldErrors />
		</div>
	{/snippet}
</Field>
