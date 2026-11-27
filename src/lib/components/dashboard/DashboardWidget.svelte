<!--
	@component
	One widget of the team's overview: a card with a heading, a link to the page where its question
	is answered, and its content. `large` widgets take a whole row of the overview's grid on wide
	screens, `compact` ones sit next to each other. With `empty` set, the widget says that one line
	instead of its content (nothing to show is said in words, never as a row of zeros).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Phosphor name, without `ph-` */
		icon: string;
		title: string;
		/** Where the widget's link goes, already resolved */
		href?: string;
		/** The link's text */
		linkLabel?: string;
		size?: 'large' | 'compact';
		/** The one line shown instead of the content while there is nothing to show */
		empty?: string;
		/** A small line under the heading, such as how fresh the figures are */
		note?: string;
		/** Anchor for the widget's spec and tour */
		testId: string;
		/** Content beside the heading, such as a badge */
		headerAction?: Snippet;
		children?: Snippet;
	}

	let {
		icon,
		title,
		href,
		linkLabel,
		size = 'compact',
		empty,
		note,
		testId,
		headerAction,
		children
	}: Props = $props();

	const headingId = $derived(`widget-${testId}`);
</script>

<section
	aria-labelledby={headingId}
	class="card bg-base-100 border-base-200 min-w-0 border shadow-sm {size === 'large'
		? 'lg:col-span-2'
		: ''}"
	data-testid="widget-{testId}"
	data-size={size}
>
	<div class="card-body gap-4 max-sm:p-4">
		<header class="flex flex-wrap items-start justify-between gap-2">
			<div class="flex min-w-0 items-center gap-3">
				<div
					class="bg-primary/10 text-primary rounded-box flex h-10 w-10 shrink-0 items-center justify-center"
				>
					<i aria-hidden="true" class="ph-duotone ph-{icon} text-xl"></i>
				</div>
				<div class="flex min-w-0 flex-col">
					<h2 id={headingId} class="card-title text-lg">{title}</h2>
					{#if note}<span class="text-base-content/60 text-xs">{note}</span>{/if}
				</div>
			</div>
			<div class="flex items-center gap-2">
				{@render headerAction?.()}
				{#if href && linkLabel}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved by the widget -->
					<a class="btn btn-ghost btn-sm" {href}>
						{linkLabel}
						<i aria-hidden="true" class="ph-duotone ph-arrow-right"></i>
					</a>
				{/if}
			</div>
		</header>
		{#if empty}
			<p class="text-base-content/70 flex items-center gap-2" data-testid="widget-empty">
				<i aria-hidden="true" class="ph-duotone ph-check-circle text-success text-xl"></i>
				{empty}
			</p>
		{:else}
			{@render children?.()}
		{/if}
	</div>
</section>
