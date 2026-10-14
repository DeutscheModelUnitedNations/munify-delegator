<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Markdown from '$lib/components/markdown/Markdown.svelte';

	/** The conference's announcement: a banner with an accent edge, the text below its heading. */
	interface Props {
		info: string;
		title: string;
		description?: string;
		showExpanded?: boolean;
	}

	let { info, title, description, showExpanded = false }: Props = $props();
	// Follows the conference's setting until the reader toggles it themselves.
	let isExpanded = $derived(showExpanded);

	const TRUNCATE_THRESHOLD = 400;
	const shouldTruncate = $derived(!showExpanded && info.length > TRUNCATE_THRESHOLD);
</script>

<section
	class="rounded-box border-info/25 from-info/15 via-info/5 relative overflow-hidden border bg-gradient-to-br to-transparent shadow-sm"
>
	<div class="bg-info absolute inset-y-0 left-0 w-1.5" aria-hidden="true"></div>
	<div class="flex flex-col gap-4 p-5 pl-7 sm:p-6 sm:pl-8">
		<div class="flex items-center gap-4">
			<div
				class="bg-info text-info-content grid size-11 shrink-0 place-items-center rounded-full shadow-md"
			>
				<i class="fa-sharp-duotone fa-solid fa-bullhorn text-lg"></i>
			</div>
			<div class="min-w-0">
				<h2 class="text-lg leading-tight font-bold">{title}</h2>
				{#if description}
					<p class="text-base-content/60 text-sm">{description}</p>
				{/if}
			</div>
		</div>

		<div
			class={shouldTruncate && !isExpanded
				? 'relative max-h-32 overflow-hidden before:absolute before:bottom-0 before:left-0 before:h-16 before:w-full before:bg-gradient-to-t before:from-base-100/90 before:to-transparent'
				: ''}
		>
			<div class="prose prose-sm max-w-none text-base">
				<Markdown source={info} />
			</div>
		</div>

		{#if shouldTruncate}
			<div class="flex justify-start">
				<button class="btn btn-ghost btn-sm text-info" onclick={() => (isExpanded = !isExpanded)}>
					{#if isExpanded}
						<i class="fa-sharp-duotone fa-solid fa-chevron-up mr-1"></i>
						{m.showLess()}
					{:else}
						<i class="fa-sharp-duotone fa-solid fa-chevron-down mr-1"></i>
						{m.showMore()}
					{/if}
				</button>
			</div>
		{/if}
	</div>
</section>
