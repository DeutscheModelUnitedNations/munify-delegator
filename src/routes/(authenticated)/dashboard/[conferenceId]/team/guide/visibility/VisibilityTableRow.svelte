<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { VisibilityRow } from '#lib/guide/workspace';
	import { VISIBILITY_CELL } from './visibilityCells';

	/**
	 * A section, an entry with its own audience, the template or the topic overview, against every
	 * reader group.
	 */
	interface Props {
		row: VisibilityRow;
		picked: number;
		/** Changes who sees a section. */
		onEdit: (section: number) => void;
		/** Changes who reads the topic overview. */
		onEditTopics: () => void;
	}

	let { row, picked, onEdit, onEditTopics }: Props = $props();
	const section = $derived(row.kind === 'section' ? row.section : null);
</script>

<tr>
	<th scope="row" class={row.kind === 'entry' ? 'ps-8 font-normal' : ''}>
		{row.kind === 'entry' ? '↳ ' : ''}{row.title}
	</th>
	{#each row.cells as cell, index (index)}
		<td
			class={['text-center text-lg', index === picked && 'bg-base-200', VISIBILITY_CELL[cell].look]}
		>
			<i class={VISIBILITY_CELL[cell].icon} aria-hidden="true"></i>
			<span class="sr-only">{VISIBILITY_CELL[cell].label()}</span>
		</td>
	{/each}
	<td>
		{#if row.kind === 'topics'}
			<button class="btn btn-ghost btn-xs" onclick={onEditTopics}>
				<i class="ph-duotone ph-eye" aria-hidden="true"></i>
				{m.guideAudience()}
			</button>
		{:else if section !== null}
			<button class="btn btn-ghost btn-xs" onclick={() => onEdit(section)}>
				<i class="ph-duotone ph-eye" aria-hidden="true"></i>
				{m.guideAudience()}
			</button>
		{/if}
	</td>
</tr>
