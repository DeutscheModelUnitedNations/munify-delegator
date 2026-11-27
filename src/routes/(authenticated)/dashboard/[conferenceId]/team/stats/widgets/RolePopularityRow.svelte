<script lang="ts">
	import Flag from '#lib/components/Flag.svelte';
	import type { PopularityRow } from './rolePopularityTable';

	interface Props {
		role: PopularityRow & { nationAlpha2Code?: string | null; icon?: string | null };
		name: string;
		format: Intl.NumberFormat;
	}

	let { role, name, format }: Props = $props();

	const counts = $derived([
		role.firstChoice,
		role.secondChoice,
		role.thirdChoice,
		role.laterChoice
	]);
</script>

<tr>
	<td>
		<span class="flex items-center gap-2">
			{#if role.nationAlpha2Code}
				<Flag size="xs" alpha2Code={role.nationAlpha2Code} />
			{:else}
				<Flag size="xs" nsa={true} icon={role.icon} />
			{/if}
			{name}
		</span>
	</td>
	<td class="text-right tabular-nums">{role.seats}</td>
	<td class="text-right tabular-nums font-semibold">{role.applications}</td>
	{#each counts as count, index (index)}
		<td class="text-right tabular-nums">{count}</td>
	{/each}
	<td class="text-right tabular-nums">{format.format(role.weightedPopularity)}</td>
</tr>
