<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { committeeSeatTotals, type PlanningCommittee } from '$lib/services/seatPlanning/hints';

	interface Props {
		/** the committees with their current seats */
		plannerCommittees: PlanningCommittee[];
		committees: { id: string; name: string; abbreviation: string }[];
		onSelectCommittee: (committeeId: string) => void;
	}

	let { plannerCommittees, committees, onSelectCommittee }: Props = $props();

	const rows = $derived(committeeSeatTotals(plannerCommittees, committees));
	const maxSeats = $derived(Math.max(1, ...rows.map(({ seats }) => seats)));
</script>

<section class="bg-base-200 rounded-box flex flex-col gap-2 p-3">
	<h4 class="text-sm font-semibold">{m.seatPlanningCommitteeSizes()}</h4>
	{#each rows as row (row.id)}
		<button
			class="hover:bg-base-300 flex items-center gap-2 rounded px-1 text-left text-sm"
			title={row.seatsPerDelegation > 1
				? `${row.name}: ${m.seatPlanningSeatsTimesDelegation({ nations: row.nations, seats: row.seatsPerDelegation })}`
				: row.name}
			onclick={() => onSelectCommittee(row.id)}
		>
			<span class="w-16 truncate font-mono">{row.abbreviation}</span>
			<span class="bg-base-300 h-3 grow overflow-hidden rounded">
				<span class="bg-primary block h-full" style:width="{(row.seats / maxSeats) * 100}%"></span>
			</span>
			<span class="w-8 text-right font-mono">{row.seats}</span>
		</button>
	{:else}
		<p class="text-base-content/60 text-sm">{m.seatPlanningNoHints()}</p>
	{/each}
</section>
