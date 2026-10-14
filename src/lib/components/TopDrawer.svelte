<script lang="ts">
	import { Dialog } from 'bits-ui';
	import SlidePanel from './SlidePanel.svelte';
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

<SlidePanel
	bind:open
	direction="top"
	keepFocus
	class="max-h-[85vh] {maxWidth} overflow-hidden rounded-b-box"
>
	<!-- Header -->
	<div class="flex items-center justify-between px-5 pt-4 pb-3">
		<Dialog.Title class="flex items-center gap-2 text-lg font-bold">
			{#if titleIcon}
				<i class="fa-sharp-duotone fa-solid {titleIcon} text-xl"></i>
			{/if}
			{title}
		</Dialog.Title>
		{#if headerActions}
			<div class="flex gap-2">
				{@render headerActions()}
			</div>
		{/if}
	</div>

	<!-- Scrollable content -->
	<div class="flex-1 overflow-y-auto px-5 pb-5">
		{@render children()}
	</div>

	<!-- Footer -->
	{#if footer}
		<div class="border-base-300 flex gap-2 border-t p-4">
			{@render footer()}
		</div>
	{/if}
</SlidePanel>
