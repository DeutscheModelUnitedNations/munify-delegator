<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** The font size of every text of a document, a point at a time. */
	interface Props {
		texts: { id: string; label: string; size: number }[];
		onstep: (id: string, step: number) => void;
	}

	let { texts, onstep }: Props = $props();
</script>

<section class="flex flex-col gap-2" aria-labelledby="layout-font-sizes">
	<h3 id="layout-font-sizes" class="text-sm font-semibold">{m.documentLayoutFontSizes()}</h3>
	<ul class="flex flex-col gap-1">
		{#each texts as { id, label, size } (id)}
			<li class="flex items-center justify-between gap-2">
				<span class="truncate text-sm">{label}</span>
				<div class="join shrink-0">
					<button
						type="button"
						class="btn btn-xs join-item"
						aria-label="{label}: {m.certificateLayoutSmaller()}"
						onclick={() => onstep(id, -1)}
					>
						<i aria-hidden="true" class="ph-duotone ph-minus"></i>
					</button>
					<span class="btn btn-xs join-item pointer-events-none w-14">{size} pt</span>
					<button
						type="button"
						class="btn btn-xs join-item"
						aria-label="{label}: {m.certificateLayoutLarger()}"
						onclick={() => onstep(id, 1)}
					>
						<i aria-hidden="true" class="ph-duotone ph-plus"></i>
					</button>
				</div>
			</li>
		{/each}
	</ul>
</section>
