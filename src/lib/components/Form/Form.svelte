<script lang="ts" generics="A extends Record<string, unknown>, B">
	import type { Snippet } from 'svelte';
	import FormSubmitButton from './FormSubmitButton.svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	interface Props {
		children: Snippet;
		class?: string;
		form: SuperForm<A, B>;
		showSubmitButton?: boolean;
		disabledButtonWhenTainted?: boolean;
	}

	let {
		class: class_,
		form,
		children,
		showSubmitButton = true,
		disabledButtonWhenTainted = true
	}: Props = $props();
	let { message, enhance, allErrors, submitting, tainted, isTainted } = $derived(form);
</script>

<form class="flex flex-col gap-2 {class_}" method="post" enctype="multipart/form-data" use:enhance>
	{@render children()}
	{#if $message}
		<div class="alert alert-success mt-5 justify-center font-bold">{$message}</div>
	{/if}
	{#if showSubmitButton}
		<FormSubmitButton
			{form}
			disabled={$allErrors.length > 0 || (disabledButtonWhenTainted ? !isTainted() : false)}
			loading={$submitting}
		/>
	{/if}
</form>
