<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PlanningCommittee } from '$lib/services/seatPlanning/hints';

	interface Props {
		committees: PlanningCommittee[];
		totalSeats: number;
	}

	let { committees, totalSeats }: Props = $props();
</script>

<tr>
	<th class="bg-base-200 z-20">{m.total()}</th>
	{#each committees as committee (committee.id)}
		{@const seats = committee.nations.length * committee.numOfSeatsPerDelegation}
		<td class="bg-base-200 text-center font-bold">
			<span
				class={committee.numOfSeatsPerDelegation > 1 ? 'tooltip tooltip-top' : ''}
				data-tip={m.seatPlanningSeatsTimesDelegation({
					nations: committee.nations.length,
					seats: committee.numOfSeatsPerDelegation
				})}
			>
				{seats}
			</span>
		</td>
	{/each}
	<td class="bg-base-200 text-center font-bold">{totalSeats}</td>
</tr>
