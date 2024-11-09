<script lang="ts" generics="A extends Record<string, unknown>, B">
	import type { Snippet } from 'svelte';
	import FormSubmitButton from './FormSubmitButton.svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	interface Props {
		children: Snippet;
		class?: string;
		form: SuperForm<A, B>;
		showSubmitButton?: boolean;
	}

	let { class: class_, form, children, showSubmitButton = true }: Props = $props();
	let { message, enhance, allErrors, submitting, tainted, isTainted } = $derived(form);
</script>

<form class="flex flex-col gap-4 {class_}" method="post" enctype="multipart/form-data" use:enhance>
	{@render children()}
	{#if $message}
		<p class="text mt-5 font-bold">{$message}</p>
	{/if}
	{#if showSubmitButton}
		<FormSubmitButton
			{form}
			disabled={$allErrors.length > 0 || !isTainted($tainted)}
			loading={$submitting}
		/>
	{/if}
</form>
