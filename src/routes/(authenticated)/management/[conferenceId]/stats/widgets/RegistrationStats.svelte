<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { registrationFilter, getHistory, getSelectedHistory } from '../stats.svelte';
	import StatsDesc from './StatsDesc.svelte';
	import type { PageData } from '../$types';
	let { data }: { data: PageData } = $props();
	let stats = $derived(data.stats);

	let selectedHistory = $derived.by(() =>
		getHistory()?.find((x) => x.timestamp === getSelectedHistory())
	);

	let { getFilteredValue } = registrationFilter();
</script>

<section
	class="stats stats-vertical col-span-2 bg-base-200 shadow-sm xl:stats-horizontal md:col-span-12 xl:col-span-9"
>
	<div class="stat">
		<div class="stat-figure xl:hidden"><i class="fa-duotone fa-flag text-3xl"></i></div>
		<div class="stat-title">{m.delegations()}</div>
		<div class="stat-value">{getFilteredValue(stats?.registered.delegations)}</div>
		<StatsDesc
			currentValue={getFilteredValue(stats?.registered.delegations)}
			historicValue={getFilteredValue(selectedHistory?.stats.registered.delegations)}
		/>
	</div>
	<div class="stat">
		<div class="stat-figure xl:hidden"><i class="fa-duotone fa-users-viewfinder text-3xl"></i></div>
		<div class="stat-title">{m.delegationMembers()}</div>
		<div class="stat-value">{getFilteredValue(stats?.registered.delegationMembers)}</div>
		<StatsDesc
			currentValue={getFilteredValue(stats?.registered.delegationMembers)}
			historicValue={getFilteredValue(selectedHistory?.stats.registered.delegationMembers)}
		/>
	</div>
	<div class="stat">
		<div class="stat-figure xl:hidden"><i class="fa-duotone fa-user-tie text-3xl"></i></div>
		<div class="stat-title">{m.singleParticipants()}</div>
		<div class="stat-value">{getFilteredValue(stats?.registered.singleParticipants)}</div>
		<StatsDesc
			currentValue={getFilteredValue(stats?.registered.singleParticipants)}
			historicValue={getFilteredValue(selectedHistory?.stats.registered.singleParticipants)}
		/>
	</div>

	<div class="stat">
		<div class="stat-figure xl:hidden">
			<i class="fa-duotone fa-chalkboard-user text-3xl"></i>
		</div>
		<div class="stat-title">{m.supervisors()}</div>
		<div class="stat-value">{stats?.registered.supervisors}</div>
		<StatsDesc
			currentValue={stats?.registered.supervisors}
			historicValue={selectedHistory?.stats.registered.supervisors}
		/>
	</div>
</section>
