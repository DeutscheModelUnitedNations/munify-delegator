<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title?: string;
		fullWidth?: boolean;
		children: Snippet;
		action?: Snippet;
		onclose?: () => void;
	}

	let { open = $bindable(), title, fullWidth = false, children, action, onclose }: Props = $props();
</script>

{#if open}
	<div class="modal {open && 'modal-open'} modal-bottom sm:modal-middle">
		<button
			class="modal-backdrop"
			aria-label="Close modal"
			onclick={() => {
				open = false;
				if (onclose) onclose();
			}}
		></button>
		<div class="modal-box {fullWidth && 'w-auto max-w-full sm:max-w-[90%]'}">
			{#if title}
				<div class="modal-top mb-4">
					<h2 class="text-xl">{title}</h2>
				</div>
			{/if}
			<div class="w-full">
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
