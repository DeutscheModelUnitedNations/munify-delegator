<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * One line of the login information card: an icon, a label above the value, and, when the
	 * account center can change it, an edit link.
	 */
	interface Props {
		icon: string;
		label: string;
		/** Where the account center edits this; no edit link when left out. */
		editHref?: string;
		editLabel?: string;
		children?: Snippet;
	}

	let { icon, label, editHref, editLabel, children }: Props = $props();
</script>

<div class="flex items-center gap-3 py-3">
	<i class="fa-sharp-duotone fa-solid fa-{icon} text-base-content/60 w-5 text-center"></i>
	<div class="flex-1 min-w-0">
		<div class="text-xs text-base-content/60">{label}</div>
		{@render children?.()}
	</div>
	{#if editHref}
		<a class="btn btn-ghost btn-sm" rel="external" href={editHref} aria-label={editLabel}>
			<i class="fa-sharp-duotone fa-solid fa-pen-to-square"></i>
		</a>
	{/if}
</div>
