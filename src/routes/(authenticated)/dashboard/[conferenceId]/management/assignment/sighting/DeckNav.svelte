<script lang="ts">
	import { deckKeyTarget, NEXT_UNREVIEWED_KEY } from '$lib/assignment/deckKeys';
	import type { DeckStatus } from '$lib/assignment/sighting';
	import codenamize from '$lib/helpers/codenamize';
	import { m } from '$lib/paraglide/messages';
	import type { DeckPosition, DeckWindowData } from '$lib/assignment/deckWindow';

	/**
	 * Moves through the applications under review one at a time: back and forth, to the next one
	 * nobody has looked at yet, or to any of them: through the strip of those around the current
	 * one, or the slider over the whole deck. A bar sums up how far the deck has come. The deck is
	 * the backend's window around the current card, which the page turns through by itself.
	 */
	interface Props {
		deck: DeckWindowData;
		/** Where the card on top lies, and the cards to step to from there */
		position: DeckPosition;
		onSelect: (id: string) => void;
		/** The slider was moved to this place in the deck */
		onSeek: (index: number) => void;
	}

	let { deck, position, onSelect, onSeek }: Props = $props();

	const previousId = $derived(position.previous?.id);
	const nextId = $derived(position.next?.id);
	const unreviewedId = $derived(position.nextUnreviewed?.id);
	const after = $derived(deck.total - deck.start - deck.entries.length);

	/** Where the slider is while it is dragged; the card only follows once it is let go. */
	let dragging = $state<number | undefined>();
	const sliderValue = $derived(dragging ?? position.index + 1);

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
	function statusOf(status: string): DeckStatus {
		return status === 'rated' || status === 'flagged' || status === 'disqualified'
			? status
			: 'unrated';
	}

	/** Arrow keys turn the cards, unless somebody is typing. */
	function onKeydown(event: KeyboardEvent) {
		const id = deckKeyTarget(event, { previousId, nextId, unreviewedId });
		if (id) onSelect(id);
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex flex-col items-center gap-3">
	<div class="flex w-full max-w-3xl flex-col gap-2">
		<div class="bg-base-300 flex h-2 w-full overflow-hidden rounded-full" aria-hidden="true">
			{#each ['rated', 'flagged', 'disqualified'] as const as status (status)}
				<div
					class={segmentColors[status]}
					style:width="{(deck.counts[status] / Math.max(deck.total, 1)) * 100}%"
					title="{statusLabels[status]}: {deck.counts[status]}"
				></div>
			{/each}
		</div>
		<input
			type="range"
			class="range range-xs range-primary w-full"
			min="1"
			max={Math.max(deck.total, 1)}
			value={sliderValue}
			aria-label={m.assignmentDeckSeek()}
			oninput={(event) => (dragging = event.currentTarget.valueAsNumber)}
			onchange={(event) => {
				dragging = undefined;
				onSeek(event.currentTarget.valueAsNumber - 1);
			}}
		/>
	</div>

	<div class="flex w-full min-w-0 items-center justify-center gap-2">
		<span class="text-base-content/50 w-16 text-right text-xs tabular-nums">
			{#if deck.start > 0}{m.assignmentDeckBefore({ count: deck.start })}{/if}
		</span>
		<ol class="flex min-w-0 flex-nowrap justify-center gap-1" aria-label={m.assignmentDeckStrip()}>
			{#each deck.entries as entry, offset (entry.id)}
				{@const status = statusOf(entry.status)}
				{@const codename = codenamize(entry.id)}
				{@const current = deck.start + offset === position.index}
				<li class="w-5 min-w-1 shrink">
					<button
						class="block h-3 w-full cursor-pointer rounded-selector transition-all {segmentColors[
							status
						]} {current
							? 'ring-primary ring-offset-base-100 h-4 ring-2 ring-offset-1'
							: 'opacity-70 hover:opacity-100'}"
						aria-label="{codename}: {statusLabels[status]}"
						aria-current={current}
						title="{codename}: {statusLabels[status]}"
						onclick={() => onSelect(entry.id)}
					></button>
				</li>
			{/each}
		</ol>
		<span class="text-base-content/50 w-16 text-xs tabular-nums">
			{#if after > 0}{m.assignmentDeckAfter({ count: after })}{/if}
		</span>
	</div>

	<div class="flex flex-wrap items-center justify-center gap-2">
		<button
			class="btn btn-sm"
			disabled={!previousId}
			onclick={() => previousId && onSelect(previousId)}
		>
			<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
			{m.assignmentDeckPrevious()}
			<kbd class="kbd kbd-xs hidden sm:inline-block">←</kbd>
		</button>
		<span class="px-2 text-sm font-medium tabular-nums" data-testid="deck-position">
			{m.assignmentDeckPosition({ current: position.index + 1, total: deck.total })}
		</span>
		<button class="btn btn-sm" disabled={!nextId} onclick={() => nextId && onSelect(nextId)}>
			{m.assignmentDeckNext()}
			<i class="fa-sharp-duotone fa-solid fa-arrow-right"></i>
			<kbd class="kbd kbd-xs hidden sm:inline-block">→</kbd>
		</button>
		<button
			class="btn btn-sm btn-primary"
			disabled={!unreviewedId}
			onclick={() => unreviewedId && onSelect(unreviewedId)}
		>
			<i class="fa-sharp-duotone fa-solid fa-forward-step"></i>
			{m.assignmentDeckNextUnreviewed()}
			<kbd class="kbd kbd-xs hidden sm:inline-block">{NEXT_UNREVIEWED_KEY.toUpperCase()}</kbd>
		</button>
	</div>
</div>
