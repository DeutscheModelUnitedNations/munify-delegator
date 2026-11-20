<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { OutlineSection } from '#lib/guide/outline';
	import { moveItem } from '#lib/guide/outlineEditing';
	import AudienceSelect from './AudienceSelect.svelte';
	import PagePicker from './PagePicker.svelte';
	import MoveButtons from './MoveButtons.svelte';

	/** One section of the sidebar: its title, who sees it and its entries. */
	interface Props {
		section: OutlineSection;
		pages: readonly { id: string; title: string; published: boolean }[];
		roles: readonly { id: string; name: string }[];
		onChange: (section: OutlineSection) => void;
		onMove: (by: number) => void;
		onRemove: () => void;
	}

	let { section, pages, roles, onChange, onMove, onRemove }: Props = $props();

	const setEntries = (entries: OutlineSection['entries']) => onChange({ ...section, entries });
</script>

<div class="rounded-box border-base-300 bg-base-100 flex flex-col gap-3 border p-3">
	<div class="flex flex-wrap items-end gap-2">
		<label class="fieldset min-w-0 flex-1">
			<span class="fieldset-legend">{m.guideSectionTitle()}</span>
			<input
				class="input input-sm w-full"
				value={section.title}
				maxlength="200"
				oninput={(event) => onChange({ ...section, title: event.currentTarget.value })}
			/>
		</label>
		<MoveButtons {onMove} {onRemove} removeLabel={m.guideRemoveSection()} size="sm" />
	</div>
	<AudienceSelect
		value={section.audience}
		{roles}
		label={m.guideAudience()}
		onChange={(audience) => audience && onChange({ ...section, audience })}
	/>
	<ul class="flex flex-col gap-2">
		{#each section.entries as entry, index (index)}
			<li class="bg-base-200 rounded-box flex flex-col gap-2 p-2">
				<div class="flex flex-wrap items-center gap-2">
					<PagePicker
						value={entry.pageId}
						{pages}
						label={m.guideEntryPage()}
						onChange={(pageId) =>
							setEntries(section.entries.map((e, at) => (at === index ? { ...e, pageId } : e)))}
					/>
					<MoveButtons
						onMove={(by) => setEntries(moveItem({ list: section.entries, index, by }))}
						onRemove={() => setEntries(section.entries.filter((_, at) => at !== index))}
						removeLabel={m.guideRemoveEntry()}
					/>
				</div>
				<div class="grid gap-2 sm:grid-cols-2">
					<input
						class="input input-xs w-full"
						placeholder={m.guideEntryLabel()}
						aria-label={m.guideEntryLabel()}
						value={entry.label ?? ''}
						oninput={(event) =>
							setEntries(
								section.entries.map((e, at) =>
									at === index ? { ...e, label: event.currentTarget.value || undefined } : e
								)
							)}
					/>
					<AudienceSelect
						value={entry.audience}
						{roles}
						optional
						label={m.guideEntryAudience()}
						onChange={(audience) =>
							setEntries(section.entries.map((e, at) => (at === index ? { ...e, audience } : e)))}
					/>
				</div>
			</li>
		{/each}
	</ul>
	<button
		class="btn btn-sm btn-ghost self-start"
		disabled={pages.length === 0}
		onclick={() => setEntries([...section.entries, { pageId: pages[0].id }])}
	>
		<i class="ph-duotone ph-plus" aria-hidden="true"></i>
		{m.guideAddEntry()}
	</button>
</div>
