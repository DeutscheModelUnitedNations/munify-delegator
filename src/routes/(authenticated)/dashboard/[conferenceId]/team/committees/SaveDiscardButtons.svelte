<!--
	@component
	Save and Discard for a form edited in place: both off until something changed, Save also while
	the entry is invalid or saving. Anything else for the row (a delete button) goes in `children`.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';

	interface Props {
		changed: boolean;
		valid: boolean;
		saving: boolean;
		onSave: () => void;
		onDiscard: () => void;
		children?: Snippet;
	}

	let { changed, valid, saving, onSave, onDiscard, children }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-2">
	<button
		type="button"
		class="btn btn-primary btn-sm"
		disabled={!changed || !valid || saving}
		onclick={onSave}
	>
		<i aria-hidden="true" class="ph-duotone ph-floppy-disk"></i>
		{m.save()}
	</button>
	<button
		type="button"
		class="btn btn-ghost btn-sm"
		disabled={!changed || saving}
		onclick={onDiscard}
	>
		{m.discardChanges()}
	</button>
	{@render children?.()}
</div>
