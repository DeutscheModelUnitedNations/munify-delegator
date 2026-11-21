<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	/** Picks one of the pages reaching the conference. */
	interface Props {
		value: string;
		pages: readonly { id: string; title: string; published: boolean }[];
		label: string;
		onChange: (pageId: string) => void;
	}

	let { value, pages, label, onChange }: Props = $props();
	const known = $derived(pages.some((page) => page.id === value));
</script>

<select
	class="select select-sm min-w-0 flex-1"
	aria-label={label}
	{value}
	onchange={(event) => onChange(event.currentTarget.value)}
>
	{#if !known}<option {value}>{m.guidePageMissing()}</option>{/if}
	{#each pages as page (page.id)}
		<option value={page.id}>{page.title}{page.published ? '' : ` (${m.guideStateDraft()})`}</option>
	{/each}
</select>
