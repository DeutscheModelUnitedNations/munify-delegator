<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * One fact as a row of a user card list (`bg-base-200 rounded-box divide-y`): an icon, what it
	 * is, its value underneath, and whatever changes it on the right.
	 */
	interface Props {
		title: string;
		faIcon: string;
		/** A line explaining the fact, under its value */
		hint?: string;
		children?: Snippet;
		actions?: Snippet;
	}

	let { title, faIcon, hint, children, actions }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
	<i
		class="fa-sharp-duotone fa-solid fa-{faIcon.replace(
			'fa-',
			''
		)} text-base-content/60 w-6 self-start pt-1 text-center text-lg"
	></i>
	<div class="flex min-w-48 grow basis-0 flex-col gap-0.5">
		<span class="font-semibold">{title}</span>
		{@render children?.()}
		{#if hint}
			<span class="text-base-content/50 text-xs">{hint}</span>
		{/if}
	</div>
	{#if actions}
		<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
	{/if}
</div>
