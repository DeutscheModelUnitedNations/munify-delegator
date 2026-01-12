<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { registrationFilter, getHistory, getSelectedHistory } from '../stats.svelte';
	import StatsDesc from './StatsDesc.svelte';
	import type { PageData } from '../$types';
	let props: { data: PageData } = $props();
	let stats = $derived(props.data.stats);

	let selectedHistory = $derived.by(() =>
		getHistory()?.find((x) => x.timestamp === getSelectedHistory())
	);

	let { getFilteredValue } = registrationFilter();
</script>

<section
	class="stats stats-vertical bg-base-200 xl:stats-horizontal col-span-2 shadow-sm md:col-span-12 xl:col-span-9"
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
		<div class="stat-value">
			{getFilteredValue(stats?.registered.delegationMembers, stats?.roleBased, 'delegationMembers')}
		</div>
		<StatsDesc
			currentValue={getFilteredValue(
				stats?.registered.delegationMembers,
				stats?.roleBased,
				'delegationMembers'
			)}
			historicValue={getFilteredValue(
				selectedHistory?.stats.registered.delegationMembers,
				selectedHistory?.stats.roleBased,
				'delegationMembers'
			)}
		/>
	</div>
	<div class="stat">
		<div class="stat-figure xl:hidden"><i class="fa-duotone fa-user-tie text-3xl"></i></div>
		<div class="stat-title">{m.singleParticipants()}</div>
		<div class="stat-value">
			{getFilteredValue(
				stats?.registered.singleParticipants,
				stats?.roleBased,
				'singleParticipants'
			)}
		</div>
		<StatsDesc
			currentValue={getFilteredValue(
				stats?.registered.singleParticipants,
				stats?.roleBased,
				'singleParticipants'
			)}
			historicValue={getFilteredValue(
				selectedHistory?.stats.registered.singleParticipants,
				selectedHistory?.stats.roleBased,
				'singleParticipants'
			)}
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
