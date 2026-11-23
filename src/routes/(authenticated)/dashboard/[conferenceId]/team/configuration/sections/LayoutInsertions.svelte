<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** What is put into a document for a person to read, each to switch on or off. */
	interface Props {
		insertions: { id: string; label: string; shown: boolean }[];
		onchange: (id: string, shown: boolean) => void;
	}

	let { insertions, onchange }: Props = $props();
</script>

<section class="flex flex-col gap-2" aria-labelledby="layout-insertions">
	<h3 id="layout-insertions" class="text-sm font-semibold">{m.documentLayoutInsertions()}</h3>
	<ul class="flex flex-col gap-1">
		{#each insertions as { id, label, shown } (id)}
			<li>
				<label class="flex cursor-pointer items-center justify-between gap-2 text-sm">
					<span class="truncate {shown ? '' : 'text-base-content/60'}">{label}</span>
					<input
						type="checkbox"
						class="toggle toggle-sm toggle-primary"
						checked={shown}
						onchange={(event) => onchange(id, event.currentTarget.checked)}
					/>
				</label>
			</li>
		{/each}
	</ul>
	<p class="text-base-content/60 text-xs">{m.documentLayoutInsertionsHint()}</p>
</section>
