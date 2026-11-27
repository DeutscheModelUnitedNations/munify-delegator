<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '#lib/paraglide/messages';

	/**
	 * Edits an agenda item's points for discussion: one line each, in order. Blank points are left
	 * out when saving (`withoutBlankPoints`; the API refuses empty ones).
	 */
	let {
		points = $bindable(),
		bare = false
	}: {
		points: string[];
		/** Without its own legend and hint, where the surrounding section has them. */
		bare?: boolean;
	} = $props();

	let fields = $state<HTMLTextAreaElement[]>([]);

	/** A new point after `index` (Enter in a point, or the button at the end), focused. */
	async function addAfter(index: number) {
		points = [...points.slice(0, index + 1), '', ...points.slice(index + 1)];
		await tick();
		fields[index + 1]?.focus();
	}

	function move({ from, to }: { from: number; to: number }) {
		if (to < 0 || to >= points.length) return;
		const next = [...points];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		points = next;
	}
</script>

<fieldset class="fieldset" aria-label={m.discussionPoints()}>
	{#if !bare}
		<legend class="fieldset-legend">
			<i class="ph-duotone ph-chats-circle" aria-hidden="true"></i>
			{m.discussionPoints()}
		</legend>
		<p class="text-base-content/70 text-sm">{m.discussionPointsHint()}</p>
	{/if}
	{#if points.length > 0}
		<ol class="flex flex-col gap-2">
			{#each points as _, index (index)}
				<li class="flex items-center gap-1">
					<span
						class="text-base-content/60 w-6 shrink-0 self-start pt-1.5 text-end text-sm"
						aria-hidden="true"
					>
						{index + 1}.
					</span>
					<!-- one point is one line: it grows while typing, Enter starts the next point -->
					<textarea
						class="textarea textarea-sm field-sizing-content min-h-0 w-full resize-none"
						rows="1"
						bind:this={fields[index]}
						bind:value={points[index]}
						aria-label={m.discussionPointLabel({ number: index + 1 })}
						onkeydown={(event) => {
							if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
							event.preventDefault();
							void addAfter(index);
						}}></textarea>
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-square"
						aria-label={m.discussionPointMoveUp({ number: index + 1 })}
						disabled={index === 0}
						onclick={() => move({ from: index, to: index - 1 })}
					>
						<i class="ph-duotone ph-arrow-up" aria-hidden="true"></i>
					</button>
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-square"
						aria-label={m.discussionPointMoveDown({ number: index + 1 })}
						disabled={index === points.length - 1}
						onclick={() => move({ from: index, to: index + 1 })}
					>
						<i class="ph-duotone ph-arrow-down" aria-hidden="true"></i>
					</button>
					<button
						type="button"
						class="btn btn-ghost btn-xs btn-square text-error"
						aria-label={m.discussionPointRemove({ number: index + 1 })}
						onclick={() => (points = points.filter((_, i) => i !== index))}
					>
						<i class="ph-duotone ph-x" aria-hidden="true"></i>
					</button>
				</li>
			{/each}
		</ol>
	{/if}
	<div>
		<button type="button" class="btn btn-sm" onclick={() => addAfter(points.length - 1)}>
			<i class="ph-duotone ph-plus" aria-hidden="true"></i>
			{m.discussionPointAdd()}
		</button>
	</div>
</fieldset>
