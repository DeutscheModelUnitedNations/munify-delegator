<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Pages through a template of several pages in the layout editor. */
	interface Props {
		/** The page shown, from 0. */
		page: number;
		count: number;
	}

	let { page = $bindable(), count }: Props = $props();
</script>

<div class="flex items-center justify-center gap-2">
	<button
		type="button"
		class="btn btn-sm btn-ghost btn-square"
		aria-label={m.documentLayoutPreviousPage()}
		disabled={page === 0}
		onclick={() => (page -= 1)}
	>
		<i aria-hidden="true" class="ph-duotone ph-caret-left"></i>
	</button>
	<span class="text-sm" aria-live="polite">
		{m.documentLayoutPage({ page: page + 1, count })}
	</span>
	<button
		type="button"
		class="btn btn-sm btn-ghost btn-square"
		aria-label={m.documentLayoutNextPage()}
		disabled={page >= count - 1}
		onclick={() => (page += 1)}
	>
		<i aria-hidden="true" class="ph-duotone ph-caret-right"></i>
	</button>
</div>
