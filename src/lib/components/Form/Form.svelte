<script lang="ts" generics="A extends Record<string, unknown>, B">
	import type { Snippet } from 'svelte';
	import FormSubmitButton from './FormSubmitButton.svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	interface Props {
		children: Snippet;
		class?: string;
		form: SuperForm<A, B>;
	}

	let { class: class_, form }: Props = $props();
	let { message, enhance, allErrors } = $derived(form);
</script>

<form class="flex flex-col gap-4 {class_}" method="post" enctype="multipart/form-data" use:enhance>
	<slot />
	{#if $message}
		<p class="text-sm">{$message}</p>
	{/if}
	<FormSubmitButton disabled={$allErrors.length > 0} />
</form>
