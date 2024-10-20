<script lang="ts">
	import Drawer from 'svelte-drawer-component';
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onClose?: () => void;
		placement?: 'left' | 'right' | 'top' | 'bottom';
		size?: string;
		children?: Snippet;
	}

	let {
		open = $bindable(),
		onClose,
		placement = 'right',
		size = '34em',
		children
	}: Props = $props();
</script>

<Drawer bind:open {size} {placement} on:clickAway={() => (onClose ? onClose() : null)}>
	<div class="flex min-h-full flex-col gap-8 bg-base-100 p-10">
		{@render children()}
		<button
			class="btn absolute right-4 top-4"
			onclick={() => {
				open = false;
				if (onClose) onClose();
			}}
			aria-label="Close"
		>
			<i class="fa-duotone fa-xmark"></i>
		</button>
	</div>
</Drawer>
