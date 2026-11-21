<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The headings of the open page, for jumping within it. */
	let { headings }: { headings: readonly { anchor: string; level: number; text: string }[] } =
		$props();
</script>

<aside class="hidden xl:block" aria-label={m.guideOnThisPage()}>
	<div class="sticky top-20">
		<h2 class="text-base-content/60 mb-2 text-xs font-semibold uppercase">{m.guideOnThisPage()}</h2>
		<ul class="flex flex-col gap-1 text-sm">
			{#each headings as heading (heading.anchor)}
				<li class={heading.level > 2 ? 'ps-3' : ''}>
					<a class="link link-hover" href="#{heading.anchor}">{heading.text}</a>
				</li>
			{/each}
		</ul>
	</div>
</aside>
