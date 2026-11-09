<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';

	/** What can be done with the selected rows. */
	interface Props {
		count: number;
		onclear: () => void;
		children?: Snippet;
	}

	let { count, onclear, children }: Props = $props();
</script>

<div class="bg-primary/10 rounded-box no-print flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
	<span class="font-medium">{m.dataGridSelected({ count })}</span>
	{@render children?.()}
	<button class="btn btn-ghost btn-xs ml-auto" onclick={onclear}>
		<i class="ph-duotone ph-x"></i>
		{m.dataGridClearSelection()}
	</button>
</div>
