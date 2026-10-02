<script lang="ts">
	import type { Snippet } from 'svelte';
	import { toggleButtonProps } from '$lib/helpers/toggleButtonProps';

	interface Props {
		/** FontAwesome icon name (without the `fa-` prefix) shown next to the title. */
		icon: string;
		title: string;
		description?: string;
		expanded?: boolean;
		id?: string;
		/** Classes of the body that holds the content while expanded. */
		contentClass?: string;
		/** Rendered at the right end of the header, e.g. a count badge. */
		badge?: Snippet;
		children: Snippet;
	}

	let {
		icon,
		title,
		description,
		expanded = $bindable(false),
		id,
		contentClass = 'p-4',
		badge,
		children
	}: Props = $props();
</script>

<div {id} class="card bg-base-200 border border-base-300">
	<div
		class="p-4 flex items-center justify-between cursor-pointer hover:bg-base-300/30 transition-colors rounded-t-lg"
		class:rounded-b-lg={!expanded}
		{...toggleButtonProps(() => (expanded = !expanded))}
	>
		<div class="flex items-center gap-3">
			<i class="fa-solid {expanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-base-content/50"
			></i>
			<i class="fa-solid fa-{icon} text-primary text-xl"></i>
			<div>
				<h3 class="text-lg font-bold">{title}</h3>
				{#if description}
					<p class="text-sm text-base-content/60">{description}</p>
				{/if}
			</div>
		</div>
		{@render badge?.()}
	</div>

	{#if expanded}
		<div class={contentClass}>
			{@render children()}
		</div>
	{/if}
</div>
