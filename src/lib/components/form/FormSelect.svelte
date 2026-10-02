<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import { type SuperForm, type FormPath } from 'sveltekit-superforms';
	import FormField from './FormField.svelte';

	interface Props {
		name: N;
		label?: string;
		description?: string;
		placeholder?: string;
		form: SuperForm<A, B>;
		options: { value: string; label: string }[];
		disabled?: boolean;
	}

	let { form, label, description, name, placeholder, options, disabled = false }: Props = $props();
	let { form: formData } = $derived(form);
</script>

<FormField {form} {name} {label} {description}>
	{#snippet input({ props, constraints })}
		<select
			{...props}
			class="select select-bordered validator w-full"
			bind:value={$formData[name]}
			{disabled}
			{...constraints}
		>
			<option disabled selected={!$formData[name]} value={null}>{placeholder}</option>
			{#each options as option (option.value)}
				<option value={option.value} selected={option.value === $formData[name]}
					>{option.label}</option
				>
			{/each}
		</select>
	{/snippet}
</FormField>
