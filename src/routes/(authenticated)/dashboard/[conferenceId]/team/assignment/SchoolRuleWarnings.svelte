<script lang="ts">
	import { fetchSchoolRules, schoolRulesSnapshot } from './board';
	import { schoolRuleBreaches, type PlannedSeats } from './schoolRules';
	import SchoolRuleAlerts from './SchoolRuleAlerts.svelte';
	import SchoolRulesCard from './SchoolRulesCard.svelte';

	/**
	 * Where the plan breaks the conference's school rules (`schoolRules.ts`): groups decided
	 * together that it seats only partly, or that the sighting excluded only partly, and
	 * Auslandsschulen with more guaranteed seats than the limit. Only warns; shows nothing while
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
	const guaranteeLimit = $derived(checked.guaranteeLimit ?? 0);
</script>

{#if variant === 'summary'}
	<SchoolRuleAlerts
		{splitGroups}
		{overGuarantee}
		groupLimit={checked.groupLimit ?? 0}
		{guaranteeLimit}
		class={className}
	/>
{:else if splitGroups.length > 0 || overGuarantee.length > 0}
	<SchoolRulesCard {splitGroups} {overGuarantee} {guaranteeLimit} class={className} />
{/if}
