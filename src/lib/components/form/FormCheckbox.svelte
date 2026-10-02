<script
	lang="ts"
	generics="A extends Record<string, unknown>, B, N extends FormPathLeaves<A, boolean> & FormPath<A>"
>
	import {
		type FormPath,
		type FormPathLeaves,
		type SuperForm,
		formFieldProxy
	} from 'sveltekit-superforms';
	import { Control, Field, Label } from 'formsnap';
	import FormFieldErrors from './FormFieldErrors.svelte';

	interface Props {
		name: N;
		label: string;
		form: SuperForm<A, B>;
		disabled?: boolean;
	}

	let { form, label, name, disabled }: Props = $props();

	// A typed proxy rather than indexing the form store: it is what makes `bind:checked` type-check
	// against a boolean field instead of the store's `unknown`.
	const { value: checked } = $derived(formFieldProxy<A, N, boolean>(form, name));
</script>

<Field {form} {name}>
	{#snippet children({ constraints })}
		<Control>
			{#snippet children({ props })}
				<div class="flex w-full items-center">
					<input
						{...props}
						type="checkbox"
						class="checkbox"
						bind:checked={$checked}
						{disabled}
						{...constraints}
					/>
					<Label class="label ml-3 cursor-pointer whitespace-break-spaces">{label}</Label>
				</div>
			{/snippet}
		</Control>
		<FormFieldErrors />
	{/snippet}
</Field>
