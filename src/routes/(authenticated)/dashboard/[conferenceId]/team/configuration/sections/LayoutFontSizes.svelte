<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	/** The font size of every text of a document, a point at a time. */
	interface Props {
		texts: { id: string; label: string; size: number }[];
		onstep: (id: string, step: number) => void;
	}

	let { texts, onstep }: Props = $props();
</script>

<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
	<span class="text-sm font-semibold">{m.certificateLayoutFontSize()}</span>
	{#each texts as { id, label, size } (id)}
		<div class="flex items-center gap-2">
			<span class="text-sm">{label}</span>
			<div class="join">
				<button
					type="button"
					class="btn btn-xs join-item"
					aria-label={m.certificateLayoutSmaller()}
					onclick={() => onstep(id, -1)}
				>
					<i class="fa-sharp-duotone fa-solid fa-minus"></i>
				</button>
				<span class="btn btn-xs join-item pointer-events-none">{size} pt</span>
				<button
					type="button"
					class="btn btn-xs join-item"
					aria-label={m.certificateLayoutLarger()}
					onclick={() => onstep(id, 1)}
				>
					<i class="fa-sharp-duotone fa-solid fa-plus"></i>
				</button>
			</div>
		</div>
	{/each}
</div>
