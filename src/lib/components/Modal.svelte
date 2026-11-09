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
		children: Snippet;
		action?: Snippet;
		onclose?: () => void;
	}

	let { open = $bindable(), title, fullWidth = false, children, action, onclose }: Props = $props();

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
		<button class="modal-backdrop" tabindex="-1" aria-label={m.a11yCloseDialog()} onclick={close}
		></button>
		<div
			class="modal-box {fullWidth && 'w-auto max-w-full sm:max-w-[90%]'}"
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
