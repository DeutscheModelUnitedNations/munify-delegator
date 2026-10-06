<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { SeatPlanner } from './seatPlanner.svelte';

	interface Props {
		planner: SeatPlanner;
		committee: { id: string; abbreviation: string };
		nation: { alpha3Code: string; name: string };
	}

	let { planner, committee, nation }: Props = $props();

	const hasSeat = $derived(planner.hasSeat(committee.id, nation.alpha3Code));
	const lockedBy = $derived(
		hasSeat ? planner.lockedBy(committee.id, nation.alpha3Code) : undefined
	);
	const label = $derived(`${nation.name}: ${committee.abbreviation}`);
</script>

<td class="text-center">
	{#if lockedBy}
		<span class="tooltip" data-tip={m.seatPlanningLockedBy({ members: lockedBy.join(', ') })}>
			<span
				class="btn btn-xs btn-square btn-primary cursor-not-allowed opacity-70"
				role="img"
				aria-label={m.seatPlanningLockedBy({ members: label })}
			>
				<i class="fa-solid fa-lock"></i>
			</span>
		</span>
	{:else}
		<button
			class="btn btn-xs btn-square {hasSeat ? 'btn-primary' : 'btn-ghost border-base-300'}"
			aria-label={label}
			aria-pressed={hasSeat}
			onclick={() => planner.setSeat(committee.id, nation.alpha3Code, !hasSeat)}
		>
			{#if hasSeat}
				<i class="fa-solid fa-check"></i>
			{/if}
		</button>
	{/if}
</td>
