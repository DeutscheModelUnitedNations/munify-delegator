<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';

	/**
	 * An open modal with a title, a body and a cancel/confirm footer. Render it inside an `{#if}`:
	 * it has no closed state of its own; cancelling and clicking the backdrop call `onClose`.
	 */
	interface Props {
		title: string;
		/** Muted line under the title */
		subtitle?: Snippet;
		/** The form fields or text */
		children?: Snippet;
		/** Classes of the box that holds the body and the footer */
		bodyClass?: string;
		/** Extra content on the left of the footer, beside the buttons */
		footer?: Snippet;
		/** Extra classes for the modal box, such as a wider max width */
		boxClass?: string;
		confirmLabel: string;
		/** Button colour of the confirm button */
		confirmClass?: string;
		confirmDisabled?: boolean;
		/** Shows a spinner on the confirm button and disables it */
		loading: boolean;
		onConfirm: () => void;
		onClose: () => void;
	}

	let {
		title,
		subtitle,
		children,
		footer,
		bodyClass = 'mt-4 flex flex-col gap-4',
		boxClass = '',
		confirmLabel,
		confirmClass = 'btn-primary',
		confirmDisabled = false,
		loading,
		onConfirm,
		onClose
	}: Props = $props();
</script>

<div class="modal modal-open">
	<div class="modal-box {boxClass}">
		<h3 class="text-lg font-bold">{title}</h3>
		{#if subtitle}
			<p class="text-base-content/60 mt-1 text-sm">{@render subtitle()}</p>
		{/if}
		<div class={bodyClass}>
			{@render children?.()}
			<div class="modal-action items-center">
				{#if footer}
					<div class="mr-auto">{@render footer()}</div>
				{/if}
				<button type="button" class="btn" onclick={onClose}>
					{m.cancel()}
				</button>
				<button
					type="button"
					class="btn {confirmClass}"
					onclick={onConfirm}
					disabled={loading || confirmDisabled}
				>
					{#if loading}<span class="loading loading-spinner loading-sm"></span>{/if}
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
	<button type="button" class="modal-backdrop" aria-label={m.close()} onclick={onClose}></button>
</div>
