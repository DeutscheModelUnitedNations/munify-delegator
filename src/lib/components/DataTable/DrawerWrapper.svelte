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
	<div class="flex flex-col p-10 bg-base-100 min-h-full gap-8">
		{@render children()}
		<button class="btn absolute top-4 right-4" onclick={onClose} aria-label="Close">
			<i class="fa-duotone fa-xmark"></i>
		</button>
	</div>
</Drawer>
