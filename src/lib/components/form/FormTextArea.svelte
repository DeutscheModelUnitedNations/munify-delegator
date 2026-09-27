<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import { type SuperForm, type FormPath } from 'sveltekit-superforms';
	import { Control, Field, Label } from 'formsnap';
	import FormDescription from './FormDescription.svelte';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import FormConstraints from './FormConstraints.svelte';

	interface Props {
		name: N;
		label?: string;
		description?: string;
		placeholder?: string;
		form: SuperForm<A, B>;
		disabled?: boolean;
	}

	let { form, label, name, placeholder, description, disabled = false }: Props = $props();
	let { form: formData } = form;
</script>

<Field {form} {name}>
	{#snippet children({ constraints })}
		<div class="flex w-full flex-col text-left">
			<Control>
				{#snippet children({ props })}
					{#if label}
						<Label class="label mb-2 whitespace-break-spaces">{label}</Label>
					{/if}
					<FormDescription {description} />
					<textarea
						{...props}
						{placeholder}
						class="textarea validator w-full"
						bind:value={$formData[name]}
						{disabled}
						{...constraints}></textarea>
				{/snippet}
			</Control>
			<FormConstraints {form} {name} />
			<FormFieldErrors />
		</div>
	{/snippet}
</Field>
