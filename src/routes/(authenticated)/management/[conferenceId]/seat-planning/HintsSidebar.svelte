<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { Role } from '$lib/services/seatPlanning/hints';
	import { useSeatPlanningParams } from './filters';
	import CommitteeSizes from './hints/CommitteeSizes.svelte';
	import RegionalBalanceHints from './hints/RegionalBalanceHints.svelte';
	import SizeHistogram from './hints/SizeHistogram.svelte';
	import SizeLimitsSection from './hints/SizeLimitsSection.svelte';
	import SizeRuleHints from './hints/SizeRuleHints.svelte';
	import UnseatedGroups from './hints/UnseatedGroups.svelte';
	import type { SeatPlanner } from './seatPlanner.svelte';
	import type { SizeLimitsStore } from './sizeLimits.svelte';

	interface Props {
		planner: SeatPlanner;
		committees: { id: string; name: string; abbreviation: string }[];
		nonStateActors: { id: string; name: string }[];
		sizeLimits: SizeLimitsStore;
	}

	let { planner, committees, nonStateActors, sizeLimits }: Props = $props();

	const MAX_SUGGESTIONS = 5;

	const params = useSeatPlanningParams();

	const nsaNames = $derived(new Map(nonStateActors.map((nsa) => [nsa.id, nsa.name])));

	const roleName = (role: Role) =>
		role.kind === 'nation'
			? getFullTranslatedCountryNameFromISO3Code(role.id)
			: (nsaNames.get(role.id) ?? role.id);

	/** jumps to the states matrix with exactly these filters */
	function showStates(filters: { size?: number; group?: string }) {
		$params.tab = null;
		$params.q = null;
		$params.size = filters.size ?? null;
		$params.group = filters.group ?? null;
		$params.noSeat = filters.group ? true : null;
	}

	/** jumps to the unfiltered states matrix, the committee's seat holders first */
	function showCommittee(committeeId: string) {
		showStates({});
		$params.sort = committeeId;
		$params.desc = true;
	}
</script>

<div class="flex flex-col gap-4">
	<h3 class="text-lg font-bold">
		<i class="fa-duotone fa-lightbulb"></i>
		{m.seatPlanningHints()}
	</h3>
	<SizeHistogram roles={planner.roles} onSelectSize={(size) => showStates({ size })} />
	<CommitteeSizes
		plannerCommittees={planner.committees}
		{committees}
		onSelectCommittee={showCommittee}
	/>
	<SizeLimitsSection roles={planner.roles} {sizeLimits} {roleName} />
	<SizeRuleHints roles={planner.roles} {roleName} maxSuggestions={MAX_SUGGESTIONS} />
	<RegionalBalanceHints {planner} {committees} maxSuggestions={MAX_SUGGESTIONS} />
	<UnseatedGroups
		seatCounts={planner.seatCounts}
		onSelectGroup={(group) => showStates({ group })}
	/>
</div>
