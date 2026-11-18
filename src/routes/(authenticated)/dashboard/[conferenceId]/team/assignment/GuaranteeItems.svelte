<script lang="ts">
	import type { GuaranteedSeatCount, GuaranteeShare } from './schoolRules';
	import { guaranteeShareText, guaranteeText } from './schoolRuleTexts';

	/** The guaranteed seats past their limits, as list items of `SchoolRuleAlerts` and `SchoolRulesCard`. */
	interface Props {
		overGuarantee: readonly GuaranteedSeatCount[];
		overShare: GuaranteeShare | null;
		guaranteeLimit: number;
	}

	let { overGuarantee, overShare, guaranteeLimit }: Props = $props();
</script>

{#if overShare}
	<li>{guaranteeShareText(overShare)}</li>
{/if}
{#each overGuarantee as count (count.school.id)}
	<li>{guaranteeText({ count, limit: guaranteeLimit })}</li>
{/each}
