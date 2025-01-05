<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onClose?: () => void;
		children: Snippet;
		width?: string;
	}

	let { open = $bindable(), onClose, children, width = '34rem' }: Props = $props();

	function close() {
		document.body.classList.remove('overflow-hidden');
		open = false;
		if (onClose) onClose();
	}

	$effect(() => {
		if (open) {
			document.body.classList.add('overflow-hidden');
		}
	});
</script>

{#if open}
	<div
		aria-hidden="true"
		onclick={close}
		class="fixed left-0 top-0 z-10 h-screen w-screen bg-black opacity-30"
	></div>
	<div class="fixed right-0 top-0 z-20 h-screen duration-300" style="width: {width}">
		<div class="flex min-h-full flex-col gap-8 bg-base-100 p-10">
			{@render children()}
			<button class="btn absolute right-4 top-4" onclick={close} aria-label="Close">
				<i class="fa-duotone fa-xmark"></i>
			</button>
		</div>
	</div>
{/if}
