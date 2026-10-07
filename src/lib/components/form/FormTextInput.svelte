<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import { type SuperForm, type FormPath } from 'sveltekit-superforms';
	import FormField from './FormField.svelte';

	interface Props {
		name: N;
		label?: string;
		description?: string;
		placeholder?: string;
		form: SuperForm<A, B>;
		type?: string;
		disabled?: boolean;
	}

	let {
		form,
		label,
		description,
		name,
		placeholder,
		type = 'text',
		disabled = false
	}: Props = $props();
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
		<input
			{...props}
			{placeholder}
			{type}
			class="input disabled:bg-base-300 validator w-full"
			bind:value={$formData[name]}
			{disabled}
			{...constraints}
		/>
	{/snippet}
</FormField>
