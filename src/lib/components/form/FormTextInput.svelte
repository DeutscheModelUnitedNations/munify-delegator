<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import { type SuperForm, type FormPath } from 'sveltekit-superforms';
	import type { Snippet } from 'svelte';
	import FormField from './FormField.svelte';

	interface Props {
		name: N;
		label?: string;
		description?: string;
		labelIcon?: Snippet;
		placeholder?: string;
		form: SuperForm<A, B>;
		type?: string;
		/** Granularity of a number input; browsers default to whole numbers. */
		step?: number | 'any';
		disabled?: boolean;
	}

	let {
		form,
		label,
		description,
		labelIcon,
		name,
		placeholder,
		type = 'text',
		step,
		disabled = false
	}: Props = $props();
	let { form: formData } = $derived(form);
</script>

<FormField
	{form}
	{name}
	{label}
	{description}
	{labelIcon}
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
			{step}
		/>
	{/snippet}
</FormField>
