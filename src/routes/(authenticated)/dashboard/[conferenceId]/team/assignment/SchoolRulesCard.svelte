<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import GuaranteeItems from './GuaranteeItems.svelte';
	import type { CollectiveGroupProblem, GuaranteedSeatCount, GuaranteeShare } from './schoolRules';
	import { splitGroupText, withoutSeatText, type SupervisorNames } from './schoolRuleTexts';

	/** The broken school rules as a small card beside the board's pool (see `SchoolRuleWarnings`). */
	interface Props {
		splitGroups: readonly CollectiveGroupProblem[];
		names: SupervisorNames;
		overGuarantee: readonly GuaranteedSeatCount[];
		/** All Auslandsschulen together past their share of the seats */
		overShare: GuaranteeShare | null;
		guaranteeLimit: number;
		class?: string;
	}

	let {
		splitGroups,
		names,
		overGuarantee,
		overShare,
		guaranteeLimit,
		class: className = ''
	}: Props = $props();

	/** How many split groups show before "show all". */
	const SHOWN = 5;
	let expanded = $state(false);
	const shown = $derived(expanded ? splitGroups : splitGroups.slice(0, SHOWN));
</script>

<section
	class="card bg-base-100 border-warning/50 border shadow-sm {className}"
	aria-label={m.schoolRulesTitle()}
>
	<div class="card-body gap-2 p-4">
		<h3 class="flex items-center gap-2 font-semibold">
			<i aria-hidden="true" class="ph-duotone ph-graduation-cap text-warning"></i>
			{m.schoolRulesTitle()}
		</h3>
		<ul class="flex flex-col gap-2 text-sm">
			{#each shown as problem (problem.group.key)}
				{@const withoutSeat = withoutSeatText(problem)}
				<li class="flex flex-col">
					<span>{splitGroupText({ problem, names })}</span>
					{#if withoutSeat}
						<span class="text-base-content/60 text-xs">{withoutSeat}</span>
					{/if}
				</li>
			{/each}
			<GuaranteeItems {overGuarantee} {overShare} {guaranteeLimit} />
		</ul>
		{#if splitGroups.length > SHOWN}
			<button class="btn btn-ghost btn-xs self-start" onclick={() => (expanded = !expanded)}>
				{expanded ? m.showLess() : m.schoolRulesShowAll({ count: splitGroups.length })}
			</button>
		{/if}
	</div>
</section>
