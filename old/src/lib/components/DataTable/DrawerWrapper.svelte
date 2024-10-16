<script lang="ts">
	import type { Snippet } from 'svelte';
	import Drawer from 'svelte-drawer-component';

	interface Props {
		open: boolean;
		onClose: () => void;
		children: Snippet;
	}

	let { open, onClose, children }: Props = $props();
</script>

<Drawer {open} size="600px" placement="right" on:clickAway={onClose}>
	<div class="flex min-h-full flex-col gap-8 bg-base-100 p-10">
		{@render children()}
		<button class="btn absolute right-4 top-4" onclick={onClose} aria-label="Close">
			<i class="fa-duotone fa-xmark"></i>
		</button>
	</div>
</Drawer>
