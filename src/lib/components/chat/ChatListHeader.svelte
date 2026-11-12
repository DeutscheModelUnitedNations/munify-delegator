<!--
	@component
	What stands above a chat list: its title, the button for a new message where the caller may
	start one, and whatever narrows the list (the team's inbox chips) below.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		title: string;
		/** Offers "new message"; left out, the list only shows what is there */
		onNew?: () => void;
		children?: Snippet;
	}

	let { title, onNew, children }: Props = $props();
</script>

<div class="border-base-300 flex flex-col gap-2 border-b px-4 py-3">
	<div class="flex items-center justify-between gap-2">
		<h2 class="font-semibold">{title}</h2>
		{#if onNew}
			<button type="button" class="btn btn-primary btn-sm" onclick={onNew} data-testid="chat-new">
				<i aria-hidden="true" class="ph-duotone ph-pencil-simple-line"></i>
				{m.chatNewMessage()}
			</button>
		{/if}
	</div>
	{@render children?.()}
</div>
