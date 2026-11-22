<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { LayoutProblem } from './layoutCheck';

	/**
	 * What would print unreadably (`checkLayout`): parts over each other or over the template's own
	 * print, the ones a machine could no longer read first. Picking one picks its part on the page.
	 */
	interface Props {
		problems: LayoutProblem[];
		label: (id: string) => string;
		onselect: (id: string) => void;
	}

	let { problems, label, onselect }: Props = $props();

	const sorted = $derived(problems.toSorted((a, b) => Number(b.breaks) - Number(a.breaks)));
	const text = ({ kind, ids }: LayoutProblem) =>
		kind === 'overlap'
			? m.documentLayoutOverlap({ a: label(ids[0]), b: label(ids[1] ?? '') })
			: m.documentLayoutOnPrint({ a: label(ids[0]) });
</script>

<section class="flex flex-col gap-2" aria-labelledby="layout-problems">
	<h3 id="layout-problems" class="text-sm font-semibold">{m.documentLayoutReadabilityTitle()}</h3>
	{#if sorted.length === 0}
		<div role="status" class="alert alert-success alert-soft py-2 text-sm">
			<i aria-hidden="true" class="ph-duotone ph-check-circle"></i>
			<span>{m.documentLayoutReadabilityFine()}</span>
		</div>
	{:else}
		<ul role="status" class="flex flex-col gap-1">
			{#each sorted as problem (`${problem.kind}:${problem.ids.join(':')}`)}
				<li>
					<button
						type="button"
						class="btn btn-ghost btn-sm h-auto w-full justify-start py-1 text-left font-normal"
						onclick={() => onselect(problem.ids[0])}
					>
						<i
							aria-hidden="true"
							class="ph-duotone shrink-0 {problem.breaks
								? 'ph-x-circle text-error'
								: 'ph-warning text-warning'}"
						></i>
						<span>{text(problem)}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</section>
