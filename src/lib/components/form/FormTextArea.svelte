<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import { type SuperForm, type FormPath } from 'sveltekit-superforms';
	import FormField from './FormField.svelte';

	interface Props {
		name: N;
		label?: string;
		description?: string;
		placeholder?: string;
		form: SuperForm<A, B>;
		disabled?: boolean;
	}

	let { form, label, name, placeholder, description, disabled = false }: Props = $props();
	let { form: formData } = $derived(form);
</script>

<FormField
	{form}
	{name}
	{label}
	{description}
	showConstraints
	class="flex w-full flex-col text-left"
>
	{#snippet input({ props, constraints })}
		<textarea
			{...props}
			{placeholder}
			class="textarea validator w-full"
			bind:value={$formData[name]}
			{disabled}
			{...constraints}></textarea>
	{/snippet}
</FormField>
