<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title?: string;
		children: Snippet;
		action?: Snippet;
	}

	let { open = $bindable(), title, children, action }: Props = $props();
</script>

{#if open}
	<div class="modal {open && 'modal-open'}">
		<button class="modal-backdrop" aria-label="Close modal" onclick={() => (open = false)}></button>
		<div class="modal-box">
			{#if title}
				<div class="modal-top mb-4">
					<h2 class="text-xl">{title}</h2>
				</div>
			{/if}
			<div class="modal-middle w-full">
				{@render children()}
			</div>
			{#if action}
				<div class="modal-action">
					{@render action()}
				</div>
			{/if}
		</div>
	</div>
{/if}
