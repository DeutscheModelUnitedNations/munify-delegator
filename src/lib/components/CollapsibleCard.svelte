<script lang="ts">
	import type { Snippet } from 'svelte';
	import { toggleButtonProps } from '$lib/helpers/toggleButtonProps';

	interface Props {
		/** FontAwesome icon name (without the `fa-` prefix) shown next to the title. */
		icon: string;
		title: string;
		description?: string;
		expanded?: boolean;
		/** Without it the body is always shown and the header is a plain heading, e.g. inside a tab. */
		collapsible?: boolean;
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
		collapsible = true,
		id,
		contentClass = 'p-4',
		badge,
		children
	}: Props = $props();

	const shown = $derived(expanded || !collapsible);
</script>

<div {id} class="card bg-base-200 border border-base-300">
	<div
		class="p-4 flex items-center justify-between rounded-t-box {collapsible
			? 'cursor-pointer hover:bg-base-300/30 transition-colors'
			: ''}"
		class:rounded-b-box={!shown}
		{...collapsible ? toggleButtonProps(() => (expanded = !expanded)) : {}}
	>
		<div class="flex items-center gap-3">
			{#if collapsible}
				<i
					class="fa-sharp-duotone fa-solid {expanded
						? 'fa-chevron-down'
						: 'fa-chevron-right'} text-base-content/50"
				></i>
			{/if}
			<i class="fa-sharp-duotone fa-solid fa-{icon} text-primary text-xl"></i>
			<div>
				<h3 class="text-lg font-bold">{title}</h3>
				{#if description}
					<p class="text-sm text-base-content/60">{description}</p>
				{/if}
			</div>
		</div>
		{@render badge?.()}
	</div>

	{#if shown}
		<div class={contentClass}>
			{@render children()}
		</div>
	{/if}
</div>
