<script lang="ts">
	import { m } from '$lib/paraglide/messages';

	/** How much applying the draft changes, at a glance. */
	interface Props {
		roles: number;
		merges: number;
		newDelegations: number;
		dissolved: number;
		singleRoles: number;
	}

	let { roles, merges, newDelegations, dissolved, singleRoles }: Props = $props();

	const stats = $derived([
		{ title: m.assignmentStatRoles(), value: roles },
		{ title: m.assignmentStatMerges(), value: merges },
		{ title: m.assignmentStatNewDelegations(), value: newDelegations },
		{ title: m.assignmentStatDissolved(), value: dissolved },
		{ title: m.assignmentStatSingleRoles(), value: singleRoles }
	]);
</script>

<div class="stats stats-vertical sm:stats-horizontal">
	{#each stats as stat (stat.title)}
		<div class="stat">
			<div class="stat-title">{stat.title}</div>
			<div class="stat-value text-2xl">{stat.value}</div>
		</div>
	{/each}
</div>
