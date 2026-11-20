<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { TemplateSlot } from '#lib/guide/outline';
	import PagePicker from './PagePicker.svelte';
	import MoveButtons from './MoveButtons.svelte';

	/** One slot of the committee template. */
	interface Props {
		slot: TemplateSlot;
		pages: readonly { id: string; title: string; published: boolean }[];
		onChange: (slot: TemplateSlot) => void;
		onMove: (by: number) => void;
		onRemove: () => void;
	}

	let { slot, pages, onChange, onMove, onRemove }: Props = $props();

	const LOOK: Record<TemplateSlot['type'], { icon: string; label: () => string }> = {
		page: { icon: 'ph-file-text', label: () => m.guideSlotPage() },
		committeePage: { icon: 'ph-users-three', label: () => m.guideSlotCommitteePage() },
		agendaItemPages: { icon: 'ph-chat-centered-text', label: () => m.guideSlotAgendaItemPages() }
	};

	function setLabel(label: string) {
		if (slot.type !== 'agendaItemPages') onChange({ ...slot, label: label || undefined });
	}
</script>

<li class="bg-base-200 rounded-box flex flex-wrap items-center gap-2 p-2">
	<i class="ph-duotone {LOOK[slot.type].icon}" aria-hidden="true"></i>
	{#if slot.type === 'page'}
		<PagePicker
			value={slot.pageId}
			{pages}
			label={m.guideEntryPage()}
			onChange={(pageId) => onChange({ ...slot, pageId })}
		/>
	{:else}
		<span class="flex-1">{LOOK[slot.type].label()}</span>
	{/if}
	{#if slot.type !== 'agendaItemPages'}
		<input
			class="input input-xs w-40"
			placeholder={m.guideEntryLabel()}
			aria-label={m.guideEntryLabel()}
			value={slot.label ?? ''}
			oninput={(event) => setLabel(event.currentTarget.value)}
		/>
	{/if}
	<MoveButtons {onMove} {onRemove} removeLabel={m.guideRemoveEntry()} />
</li>
