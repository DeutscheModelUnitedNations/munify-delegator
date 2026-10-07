<script lang="ts" generics="A extends Record<string, unknown>, B, N extends FormPath<A> & keyof A">
	import type { Snippet } from 'svelte';
	import { type SuperForm, type FormPath } from 'sveltekit-superforms';
	import { Control, Field, Label, type ControlAttrs } from 'formsnap';
	import FormDescription from './FormDescription.svelte';
	import FormFieldErrors from './FormFieldErrors.svelte';
	import FormConstraints from './FormConstraints.svelte';

	/**
	 * The frame every labelled form field shares: Formsnap's `Field` and `Control` with the label,
	 * description and error list around the input that `input` renders.
	 */
	interface Props {
		form: SuperForm<A, B>;
		name: N;
		label?: string;
		description?: string;
		/** A pictogram shown before the label. */
		labelIcon?: Snippet;
		/** Shows the field's constraints (length, range, …) under the input. */
		showConstraints?: boolean;
		class?: string;
		/** Renders the input; spread `props` and `constraints` onto it. */
		input: Snippet<[{ props: ControlAttrs; constraints: Record<string, unknown> }]>;
	}

	let {
		form,
		name,
		label,
		description,
		labelIcon,
		showConstraints = false,
		class: className = 'flex w-full flex-col',
		input
	}: Props = $props();
</script>

<Field {form} {name}>
	{#snippet children({ constraints })}
		<div class={className}>
			<Control>
				{#snippet children({ props })}
					{#if label}
						<Label class="label mb-2 gap-2 whitespace-break-spaces">
							{#if labelIcon}{@render labelIcon()}{/if}
							{label}
						</Label>
					{/if}
					<FormDescription {description} />
					{@render input({ props, constraints })}
				{/snippet}
			</Control>
			{#if showConstraints}
				<FormConstraints {form} {name} />
			{/if}
			<FormFieldErrors />
		</div>
	{/snippet}
</Field>
