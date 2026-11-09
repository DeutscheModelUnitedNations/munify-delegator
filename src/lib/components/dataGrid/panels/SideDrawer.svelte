<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import { Dialog } from 'bits-ui';
	import SlidePanel from '#lib/components/SlidePanel.svelte';

	interface Props {
		open: boolean;
		title: string;
		/** Phosphor icon class for the header icon (e.g. 'ph-funnel') */
		icon: string;
		/** Scrollable content */
		children: Snippet;
		/** Pinned below the scrollable content */
		footer?: Snippet;
	}

	let { open = $bindable(), title, icon, children, footer }: Props = $props();
</script>

<SlidePanel bind:open direction="right" class="max-w-xl overflow-hidden">
	<!-- Header -->
	<div class="flex items-center justify-between px-5 pt-4 pb-3">
		<Dialog.Title class="flex items-center gap-2 text-lg font-bold">
			<i aria-hidden="true" class="ph-duotone {icon} text-xl"></i>
			{title}
		</Dialog.Title>
		<Dialog.Close class="btn btn-ghost btn-sm btn-circle" aria-label={m.close()}>
			<i aria-hidden="true" class="ph-duotone ph-x"></i>
		</Dialog.Close>
	</div>

	<!-- Scrollable content -->
	<div class="flex-1 overflow-y-auto px-5 pb-5">
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
</SlidePanel>
