<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Which page of the template each field read off a scan is on, to put one on another. */
	interface Props {
		fields: { id: string; label: string; page: number }[];
		/** The pages to choose from, from 0. */
		pages: number[];
		onmove: (id: string, page: number) => void;
	}

	let { fields, pages, onmove }: Props = $props();
</script>

<fieldset class="flex flex-wrap gap-x-6 gap-y-2">
	<legend class="mb-1 text-sm font-semibold">{m.documentLayoutFieldPages()}</legend>
	{#each fields as field (field.id)}
		<label class="flex items-center gap-2 text-sm">
			<span>{field.label}</span>
			<select
				class="select select-sm w-auto"
				value={field.page}
				onchange={(event) => onmove(field.id, Number(event.currentTarget.value))}
			>
				{#each pages as choice (choice)}
					<option value={choice}>{m.documentLayoutPageNumberOption({ page: choice + 1 })}</option>
				{/each}
			</select>
		</label>
	{/each}
</fieldset>
