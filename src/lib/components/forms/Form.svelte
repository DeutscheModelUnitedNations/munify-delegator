<script lang="ts" generics="A extends Record<string, unknown>, B">
	import type { Snippet } from 'svelte';
	import FormSubmitButton from './FormSubmitButton.svelte';
	import type { SuperForm } from 'sveltekit-superforms';
	import { type Writable } from 'svelte/store';
	interface Props {
		children: Snippet;
		class?: string;
		form: SuperForm<A, B>;
	}

	let { class: class_, children, form }: Props = $props();
	let { message, enhance } = form;
</script>

<form class="flex flex-col gap-4 {class_}" method="post" use:enhance>
	{@render children()}
	{#if $message}
		<p class="text-sm">{$message}</p>
	{/if}
	<FormSubmitButton />
</form>
