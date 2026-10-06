<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { translateRegionalGroup } from '$lib/services/enumTranslations';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import {
		regionalBalance,
		type PlanningCommittee,
		type RegionalBalanceHint
	} from '$lib/services/seatPlanning/hints';
	import { unMembers } from '$lib/services/seatPlanning/unMembers';

	interface Props {
		committees: PlanningCommittee[];
		seatCounts: Map<string, number>;
		abbreviations: Map<string, string>;
		maxSuggestions: number;
	}

	let { committees, seatCounts, abbreviations, maxSuggestions }: Props = $props();

	/** deviation of a group's seat share from its member share that is pointed out, in points */
	const THRESHOLD = 5;

	const hints = $derived(regionalBalance(committees, unMembers, seatCounts, THRESHOLD));

	function describe(hint: RegionalBalanceHint) {
		const values = {
			group: translateRegionalGroup(hint.group),
			committee: abbreviations.get(hint.committeeId) ?? '',
			seatShare: Math.round(hint.seatShare),
			memberShare: Math.round(hint.memberShare)
		};
		return hint.deviation < 0
			? m.seatPlanningUnderrepresented(values)
			: m.seatPlanningOverrepresented(values);
	}
</script>

{#if hints.length > 0}
	<section class="flex flex-col gap-2">
		<h4 class="text-sm font-semibold">{m.seatPlanningRegionalBalance()}</h4>
		{#each hints as hint (`${hint.committeeId}:${hint.group}`)}
			<div class="alert alert-info alert-soft items-start p-3 text-sm">
				<i class="fa-duotone fa-earth-americas mt-0.5"></i>
				<div class="flex flex-col gap-1">
					<p>{describe(hint)}</p>
					{#if hint.suggestions.length > 0}
						<p>
							<span class="font-semibold">{m.seatPlanningSuggestions()}</span>
							{hint.suggestions
								.slice(0, maxSuggestions)
								.map(getFullTranslatedCountryNameFromISO3Code)
								.join(', ')}
						</p>
					{/if}
				</div>
			</div>
		{/each}
	</section>
{/if}
