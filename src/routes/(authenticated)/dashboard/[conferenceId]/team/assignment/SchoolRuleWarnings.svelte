<script lang="ts">
	import { fetchSchoolRules, fetchSupervisorNames, schoolRulesSnapshot } from './board';
	import { schoolRuleBreaches, type PlannedSeats } from './schoolRules';
	import SchoolRuleAlerts from './SchoolRuleAlerts.svelte';
	import SchoolRulesCard from './SchoolRulesCard.svelte';

	/**
	 * Where the plan breaks the conference's school rules (`schoolRules.ts`): groups decided
	 * together that it seats only partly, or that the sighting excluded only partly, and
	 * Auslandsschulen with more guaranteed seats than the limit, alone or all together. Only warns; shows nothing while
	 * every rule holds.
	 */
	interface Props {
		conferenceId: string;
		/** The plan, as the board sees it */
		plan: PlannedSeats;
		/** `board`: a small card beside the pool; `summary`: alerts, as on the summary tab */
		variant?: 'board' | 'summary';
		class?: string;
	}

	let { conferenceId, plan, variant = 'summary', class: className = '' }: Props = $props();

	const rules = $derived(await fetchSchoolRules(conferenceId));
	const plain = schoolRulesSnapshot();
	const checked = $derived(plain(rules));
	const breaches = $derived(schoolRuleBreaches({ ...checked, plan }));
	const splitGroups = $derived(breaches.splitGroups);
	const overGuarantee = $derived(breaches.overGuarantee);
	const overShare = $derived(breaches.overShare);
	const guaranteeLimit = $derived(checked.guaranteeLimit ?? 0);
	// the names of the split groups' supervisors, keyed by a primitive so they are asked for again
	// only when other groups split
	const supervisorKey = $derived(
		[...new Set(splitGroups.map((problem) => problem.group.supervisorId))].sort().join(',')
	);
	const names = $derived(await fetchSupervisorNames(supervisorKey ? supervisorKey.split(',') : []));
</script>

{#if variant === 'summary'}
	<SchoolRuleAlerts
		{splitGroups}
		{names}
		{overGuarantee}
		{overShare}
		groupLimit={checked.groupLimit ?? 0}
		{guaranteeLimit}
		class={className}
	/>
{:else if splitGroups.length > 0 || overGuarantee.length > 0 || overShare}
	<SchoolRulesCard
		{splitGroups}
		{names}
		{overGuarantee}
		{overShare}
		{guaranteeLimit}
		class={className}
	/>
{/if}
