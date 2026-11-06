<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { CollectiveGroupProblem, GuaranteedSeatCount } from './schoolRules';
	import {
		guaranteeText,
		splitGroupText,
		withoutSeatText,
		type NamedSupervisor
	} from './schoolRuleTexts';

	/** The broken school rules as alerts, on the summary and when applying (see `SchoolRuleWarnings`). */
	interface Props {
		splitGroups: readonly CollectiveGroupProblem<NamedSupervisor>[];
		overGuarantee: readonly GuaranteedSeatCount[];
		groupLimit: number;
		guaranteeLimit: number;
		class?: string;
	}

	let {
		splitGroups,
		overGuarantee,
		groupLimit,
		guaranteeLimit,
		class: className = ''
	}: Props = $props();
</script>

{#if splitGroups.length > 0}
	<div class="alert alert-warning alert-soft {className}" role="status">
		<i class="fa-sharp-duotone fa-solid fa-people-group text-xl"></i>
		<div class="flex flex-col gap-1">
			<h3 class="font-bold">{m.schoolRuleGroupsSplitTitle()}</h3>
			<p class="text-sm">{m.schoolRuleGroupsSplitHint({ limit: groupLimit })}</p>
			<ul class="list-inside list-disc text-sm">
				{#each splitGroups as problem (problem.group.key)}
					<li>
						{splitGroupText(problem)}
						<span class="opacity-70">{withoutSeatText(problem) ?? ''}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
{#if overGuarantee.length > 0}
	<div class="alert alert-warning alert-soft {className}" role="status">
		<i class="fa-sharp-duotone fa-solid fa-earth-europe text-xl"></i>
		<div class="flex flex-col gap-1">
			<h3 class="font-bold">{m.schoolRuleGuaranteesOverLimitTitle()}</h3>
			<ul class="list-inside list-disc text-sm">
				{#each overGuarantee as count (count.school.id)}
					<li>{guaranteeText({ count, limit: guaranteeLimit })}</li>
				{/each}
			</ul>
		</div>
	</div>
{/if}
