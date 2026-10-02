<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Drawer } from 'vaul-svelte';

	interface Props {
		open: boolean;
		title: string;
		/** FontAwesome icon class for the header icon (e.g. 'fa-filter') */
		icon: string;
		/** Scrollable content */
		children: Snippet;
		/** Pinned below the scrollable content */
		footer?: Snippet;
	}

	let { open = $bindable(), title, icon, children, footer }: Props = $props();
</script>

<Drawer.Root bind:open direction="right">
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 z-40 bg-black/40" />
		<Drawer.Content
			class="bg-base-100 fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden outline-none"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-5 pt-4 pb-3">
				<Drawer.Title class="flex items-center gap-2 text-lg font-bold">
					<i class="fa-duotone {icon} text-xl"></i>
					{title}
				</Drawer.Title>
				<Drawer.Close class="btn btn-ghost btn-sm btn-circle">
					<i class="fa-duotone fa-xmark"></i>
				</Drawer.Close>
			</div>

			<!-- Scrollable content -->
			<div class="flex-1 overflow-y-auto px-5 pb-5" data-vaul-no-drag>
				<div class="flex flex-col gap-4">
					{@render children()}
				</div>
			</div>

			{#if footer}
				<!-- Footer -->
				<div class="border-base-300 flex gap-2 border-t p-4">
					{@render footer()}
				</div>
			{/if}

			<!-- Drag handle -->
			<div class="absolute top-1/2 left-0 flex -translate-y-1/2 items-center px-1">
				<div class="bg-base-content/30 h-12 w-1.5 rounded-full"></div>
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
