<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { CommitteeTemplate, TemplateSlot } from '#lib/guide/outline';
	import { moveItem, newSlot } from '#lib/guide/outlineEditing';
	import SlotRow from './SlotRow.svelte';

	/**
	 * The committee template: the entries every committee's section gets, the committee's own page
	 * and its agenda items' pages among them, and where those sections go.
	 */
	interface Props {
		template: CommitteeTemplate | undefined;
		sectionTitles: readonly string[];
		pages: readonly { id: string; title: string; published: boolean }[];
		onEnable: (enabled: boolean) => void;
		onChange: (template: CommitteeTemplate) => void;
	}

	let { template, sectionTitles, pages, onEnable, onChange }: Props = $props();

	const SLOT_TYPES: { type: TemplateSlot['type']; label: () => string }[] = [
		{ type: 'page', label: () => m.guideSlotPage() },
		{ type: 'committeePage', label: () => m.guideSlotCommitteePage() },
		{ type: 'agendaItemPages', label: () => m.guideSlotAgendaItemPages() }
	];
</script>

{#snippet slots(current: CommitteeTemplate)}
	{@const setSlots = (list: TemplateSlot[]) => onChange({ ...current, slots: list })}
	<label class="fieldset">
		<span class="fieldset-legend">{m.guideTemplatePosition()}</span>
		<select
			class="select select-sm"
			value={String(current.position)}
			onchange={(event) => onChange({ ...current, position: Number(event.currentTarget.value) })}
		>
			{#each sectionTitles as title, index (index)}
				<option value={String(index)}>{m.guideTemplateBefore({ section: title })}</option>
			{/each}
			<option value={String(sectionTitles.length)}>{m.guideTemplateAtEnd()}</option>
		</select>
	</label>
	<ul class="flex flex-col gap-2">
		{#each current.slots as slot, index (index)}
			<SlotRow
				{slot}
				{pages}
				onChange={(changed) => setSlots(current.slots.map((s, at) => (at === index ? changed : s)))}
				onMove={(by) => setSlots(moveItem({ list: current.slots, index, by }))}
				onRemove={() => setSlots(current.slots.filter((_, at) => at !== index))}
			/>
		{/each}
	</ul>
	<div class="flex flex-wrap gap-2">
		{#each SLOT_TYPES as option (option.type)}
			<button
				class="btn btn-sm btn-ghost"
				disabled={option.type === 'page' && pages.length === 0}
				onclick={() =>
					setSlots([
						...current.slots,
						newSlot({ type: option.type, firstPageId: pages[0]?.id ?? '' })
					])}
			>
				<i class="ph-duotone ph-plus" aria-hidden="true"></i>
				{option.label()}
			</button>
		{/each}
	</div>
{/snippet}

<section
	class="rounded-box border-base-300 bg-base-100 flex flex-col gap-3 border p-3"
	data-tour="team.guideSidebar.template"
>
	<label class="label cursor-pointer justify-start gap-3">
		<input
			type="checkbox"
			class="toggle toggle-primary"
			checked={!!template}
			onchange={(event) => onEnable(event.currentTarget.checked)}
		/>
		<span class="font-semibold">{m.guideCommitteeTemplate()}</span>
	</label>
	<p class="text-sm opacity-70">{m.guideCommitteeTemplateHint()}</p>
	{#if template}{@render slots(template)}{/if}
</section>
