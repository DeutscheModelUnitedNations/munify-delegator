<script lang="ts">
	import { deckKeyTarget, NEXT_UNREVIEWED_KEY } from '$lib/assignment/deckKeys';
	import {
		deckPosition,
		deckStatus,
		nextUnreviewedId,
		type DeckStatus,
		type SightingEntry
	} from '$lib/assignment/sighting';
	import { m } from '$lib/paraglide/messages';

	/**
	 * Moves through the applications under review one at a time: back and forth, to the next one
	 * nobody has looked at yet, or straight to any of them through the strip showing the whole deck.
	 */
	interface Props {
		deck: SightingEntry[];
		currentId: string | undefined;
		onSelect: (id: string) => void;
	}

	let { deck, currentId, onSelect }: Props = $props();

	const position = $derived(deckPosition(deck, currentId));
	const unreviewedId = $derived(nextUnreviewedId(deck, position.current?.id));

	const segmentColors: Record<DeckStatus, string> = {
		rated: 'bg-success',
		flagged: 'bg-warning',
		disqualified: 'bg-error',
		unrated: 'bg-base-300'
	};
	const statusLabels: Record<DeckStatus, string> = {
		rated: m.assignmentStatusRated(),
		flagged: m.assignmentStatusFlagged(),
		disqualified: m.assignmentStatusDisqualified(),
		unrated: m.assignmentStatusUnrated()
	};

	/** Arrow keys turn the cards, unless somebody is typing. */
	function onKeydown(event: KeyboardEvent) {
		const id = deckKeyTarget(event, { ...position, unreviewedId });
		if (id) onSelect(id);
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex flex-col items-center gap-3">
	<ol class="flex flex-wrap justify-center gap-1" aria-label={m.assignmentDeckStrip()}>
		{#each deck as entry, index (entry.id)}
			{@const status = deckStatus(entry)}
			<li>
				<button
					class="block h-3 w-5 cursor-pointer rounded-sm transition-all {segmentColors[
						status
					]} {index === position.index
						? 'ring-primary ring-offset-base-100 h-4 ring-2 ring-offset-1'
						: 'opacity-70 hover:opacity-100'}"
					aria-label="{entry.codename}: {statusLabels[status]}"
					aria-current={index === position.index}
					title="{entry.codename}: {statusLabels[status]}"
					onclick={() => onSelect(entry.id)}
				></button>
			</li>
		{/each}
	</ol>

	<div class="flex flex-wrap items-center justify-center gap-2">
		<button
			class="btn btn-sm"
			disabled={!position.previousId}
			onclick={() => position.previousId && onSelect(position.previousId)}
		>
			<i class="fa-duotone fa-arrow-left"></i>
			{m.assignmentDeckPrevious()}
			<kbd class="kbd kbd-xs hidden sm:inline-block">←</kbd>
		</button>
		<span class="px-2 text-sm font-medium tabular-nums" data-testid="deck-position">
			{m.assignmentDeckPosition({ current: position.index + 1, total: position.total })}
		</span>
		<button
			class="btn btn-sm"
			disabled={!position.nextId}
			onclick={() => position.nextId && onSelect(position.nextId)}
		>
			{m.assignmentDeckNext()}
			<i class="fa-duotone fa-arrow-right"></i>
			<kbd class="kbd kbd-xs hidden sm:inline-block">→</kbd>
		</button>
		<button
			class="btn btn-sm btn-primary"
			disabled={!unreviewedId}
			onclick={() => unreviewedId && onSelect(unreviewedId)}
		>
			<i class="fa-duotone fa-forward-step"></i>
			{m.assignmentDeckNextUnreviewed()}
			<kbd class="kbd kbd-xs hidden sm:inline-block">{NEXT_UNREVIEWED_KEY.toUpperCase()}</kbd>
		</button>
	</div>
</div>
