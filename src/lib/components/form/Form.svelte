<script lang="ts" generics="A extends Record<string, unknown>, B">
	import { onMount, type Snippet } from 'svelte';
	import FormSubmitButton from './FormSubmitButton.svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	interface Props {
		children: Snippet;
		class?: string;
		form: SuperForm<A, B>;
		showSubmitButton?: boolean;
		requireTaintedToSubmit?: boolean;
		formElement?: HTMLFormElement;
		action?: string;
	}

	let {
		class: class_,
		form,
		children,
		showSubmitButton = true,
		requireTaintedToSubmit = true,
		formElement = $bindable(),
		action
	}: Props = $props();
	let { message, enhance, allErrors, submitting, isTainted } = $derived(form);

	// Every form submits through a mutation in `onUpdate`; there is no server action behind it. A
	// submit before hydration attaches `enhance` would post natively and land on a 405 page, so the
	// button stays disabled until the form has mounted.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<form
	bind:this={formElement}
	class="flex flex-col gap-2 {class_}"
	method="post"
	enctype="multipart/form-data"
	use:enhance
	{action}
>
	{@render children()}
	{#if $message}
		<div class="alert alert-success mt-5 justify-center font-bold">{$message}</div>
	{/if}
	{#if showSubmitButton}
		<FormSubmitButton
			{form}
			disabled={!mounted ||
				$allErrors.length > 0 ||
				(requireTaintedToSubmit ? !isTainted() : false)}
			loading={$submitting}
		/>
	{/if}
</form>
