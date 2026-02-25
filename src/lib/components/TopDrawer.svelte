<script lang="ts">
	import { Drawer } from 'vaul-svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Controls drawer open/closed state — two-way bindable */
		open: boolean;
		/** Max width class for the drawer panel */
		maxWidth?: string;
		/** Title text for the drawer header */
		title: string;
		/** FontAwesome icon class for the header icon (e.g. 'fa-id-badge') */
		titleIcon?: string;
		/** Snippet for header action buttons (profile link, close) */
		headerActions?: Snippet;
		/** Main scrollable content */
		children: Snippet;
		/** Footer with action buttons */
		footer?: Snippet;
	}

	let {
		open = $bindable(false),
		maxWidth = 'max-w-2xl',
		title,
		titleIcon,
		headerActions,
		children,
		footer
	}: Props = $props();
</script>

<Drawer.Root bind:open direction="top" openFocus={null}>
	<Drawer.Portal>
		<Drawer.Overlay class="fixed inset-0 z-40 bg-black/40" />
		<Drawer.Content
			class="bg-base-100 fixed top-0 left-1/2 z-50 flex max-h-[85vh] w-full {maxWidth} -translate-x-1/2 flex-col overflow-hidden rounded-b-2xl outline-none"
		>
			<!-- Header -->
			<div class="flex items-center justify-between px-5 pt-4 pb-3">
				<Drawer.Title class="flex items-center gap-2 text-lg font-bold">
					{#if titleIcon}
						<i class="fa-duotone {titleIcon} text-xl"></i>
					{/if}
					{title}
				</Drawer.Title>
				{#if headerActions}
					<div class="flex gap-2">
						{@render headerActions()}
					</div>
				{/if}
			</div>

			<!-- Scrollable content -->
			<div class="flex-1 overflow-y-auto px-5 pb-5" data-vaul-no-drag>
				{@render children()}
			</div>

			<!-- Footer -->
			{#if footer}
				<div class="border-base-300 flex gap-2 border-t p-4">
					{@render footer()}
				</div>
			{/if}

			<!-- Drag handle (bottom for top drawer) -->
			<div class="flex justify-center pb-3 pt-1">
				<div class="bg-base-content/30 h-1.5 w-12 rounded-full"></div>
			</div>
		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
