<script lang="ts" module>
	export type DrawerDirection = 'top' | 'right' | 'bottom';
</script>

<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Snippet } from 'svelte';

	interface Props {
		/** Controls drawer open/closed state — two-way bindable */
		open: boolean;
		/** The edge the drawer slides in from */
		direction?: DrawerDirection;
		/** Sizing classes for the panel (max width / height, rounding, overflow) */
		class?: string;
		/** Keep focus where it is instead of moving it into the panel on open */
		keepFocus?: boolean;
		/** Panel content. Use `Dialog.Title` / `Dialog.Close` from bits-ui inside it. */
		children: Snippet;
	}

	let {
		open = $bindable(false),
		direction = 'right',
		class: className = '',
		keepFocus = false,
		children
	}: Props = $props();

	const position = {
		top: 'inset-x-0 top-0 mx-auto w-full',
		right: 'inset-y-0 right-0 h-full w-full',
		bottom: 'inset-x-0 bottom-0 mx-auto w-full'
	} as const;

	const offscreen = {
		top: { y: '-100%' },
		right: { x: '100%' },
		bottom: { y: '100%' }
	} as const;
</script>

<!--
	A bits-ui dialog that slides in from one edge. forceMount hands the unmounting to the `{#if}`
	below, which keeps the node alive until the out transition has finished — so overlay clicks,
	Escape and close buttons all animate out alike.
-->
<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay forceMount>
			{#snippet child({ props, open })}
				{#if open}
					<div
						{...props}
						class="fixed inset-0 z-40 bg-black/40"
						transition:fade={{ duration: 200 }}
					></div>
				{/if}
			{/snippet}
		</Dialog.Overlay>
		<Dialog.Content
			forceMount
			onOpenAutoFocus={keepFocus ? (event) => event.preventDefault() : undefined}
		>
			{#snippet child({ props, open })}
				{#if open}
					<div
						{...props}
						class="bg-base-100 fixed z-50 flex flex-col outline-none {position[
							direction
						]} {className}"
						transition:fly={{ ...offscreen[direction], duration: 300, easing: cubicOut }}
					>
						{@render children()}
					</div>
				{/if}
			{/snippet}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
