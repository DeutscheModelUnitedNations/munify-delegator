<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		/** The seat counts to choose from, smallest first. */
		seatCounts: number[];
		/** Undefined shows every seat count. */
		seats: number | undefined;
		onChange: (seats: number | undefined) => void;
	}

	let { seatCounts, seats, onChange }: Props = $props();
</script>

<label class="flex items-center gap-2 text-sm">
	<span>{m.statsRolePopularitySeatFilter()}</span>
	<select
		class="select select-sm select-bordered bg-base-100 w-auto"
		onchange={(e) => {
			const value = e.currentTarget.value;
			onChange(value === '' ? undefined : Number(value));
		}}
	>
		<option value="" selected={seats === undefined}>{m.statsRolePopularityAllSeats()}</option>
		{#each seatCounts as count (count)}
			<option value={String(count)} selected={seats === count}>{count}</option>
		{/each}
	</select>
</label>
