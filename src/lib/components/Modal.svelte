<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { modalFocus } from '#lib/helpers/modalFocus';

	interface Props {
		open: boolean;
		title?: string;
		fullWidth?: boolean;
		/** Wider than daisyUI's default for longer reading text, short of `fullWidth`. */
		wide?: boolean;
		/** Wider still, for pickers that lay their options out in columns. */
		wider?: boolean;
		/** Clicking beside the box leaves it open, where that would lose something; Escape still closes. */
		keepOpenOnBackdrop?: boolean;
		children: Snippet;
		action?: Snippet;
		onclose?: () => void;
	}

	let {
		open = $bindable(),
		title,
		fullWidth = false,
		wide = false,
		wider = false,
		keepOpenOnBackdrop = false,
		children,
		action,
		onclose
	}: Props = $props();

	const titleId = $props.id();

	function close() {
		open = false;
		if (onclose) onclose();
	}
</script>

<!-- Mounted open, so daisyUI's own CSS transition never runs; these fade and scale it instead -->
{#if open}
	<div
		class="modal {open && 'modal-open'} modal-bottom sm:modal-middle"
		transition:fade={{ duration: 150 }}
	>
		<!-- Pointer users close by clicking beside the box; keyboard users have Escape -->
		{#if keepOpenOnBackdrop}
			<div class="modal-backdrop"></div>
		{:else}
			<button class="modal-backdrop" tabindex="-1" aria-label={m.a11yCloseDialog()} onclick={close}
			></button>
		{/if}
		<div
			class="modal-box {fullWidth && 'w-auto max-w-full sm:max-w-[90%]'} {wide &&
				'sm:max-w-3xl'} {wider && 'sm:max-w-5xl'}"
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? titleId : undefined}
			{@attach modalFocus(close)}
			transition:scale={{ start: 0.96, duration: 180, easing: cubicOut }}
		>
			{#if title}
				<div class="modal-top mb-4">
					<h2 id={titleId} class="text-xl">{title}</h2>
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
