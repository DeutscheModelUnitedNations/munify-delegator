<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import GuaranteeItems from './GuaranteeItems.svelte';
	import type { CollectiveGroupProblem, GuaranteedSeatCount, GuaranteeShare } from './schoolRules';
	import { splitGroupText, withoutSeatText, type SupervisorNames } from './schoolRuleTexts';

	/** The broken school rules as alerts, on the summary and when applying (see `SchoolRuleWarnings`). */
	interface Props {
		splitGroups: readonly CollectiveGroupProblem[];
		names: SupervisorNames;
		overGuarantee: readonly GuaranteedSeatCount[];
		/** All Auslandsschulen together past their share of the seats */
		overShare: GuaranteeShare | null;
		groupLimit: number;
		guaranteeLimit: number;
		class?: string;
	}

	let {
		splitGroups,
		names,
		overGuarantee,
		overShare,
		groupLimit,
		guaranteeLimit,
		class: className = ''
	}: Props = $props();
</script>

{#if splitGroups.length > 0}
	<div class="alert alert-warning alert-soft {className}" role="status">
		<i aria-hidden="true" class="ph-duotone ph-users-three text-xl"></i>
		<div class="flex flex-col gap-1">
			<h3 class="font-bold">{m.schoolRuleGroupsSplitTitle()}</h3>
			<p class="text-sm">{m.schoolRuleGroupsSplitHint({ limit: groupLimit })}</p>
			<ul class="list-inside list-disc text-sm">
				{#each splitGroups as problem (problem.group.key)}
					<li>
						{splitGroupText({ problem, names })}
						<span class="opacity-70">{withoutSeatText(problem) ?? ''}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
{#if overGuarantee.length > 0 || overShare}
	<div class="alert alert-warning alert-soft {className}" role="status">
		<i aria-hidden="true" class="ph-duotone ph-globe-hemisphere-east text-xl"></i>
		<div class="flex flex-col gap-1">
			<h3 class="font-bold">{m.schoolRuleGuaranteesOverLimitTitle()}</h3>
			<ul class="list-inside list-disc text-sm">
				<GuaranteeItems {overGuarantee} {overShare} {guaranteeLimit} />
			</ul>
		</div>
	</div>
{/if}
