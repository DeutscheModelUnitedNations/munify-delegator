<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { unifiedFilter, getHistory, getSelectedHistory } from '../stats.svelte';
	import StatsDesc from './StatsDesc.svelte';
	import type { PageData } from '../$types';
	let props: { data: PageData } = $props();
	let stats = $derived(props.data.stats);

	let { getFilteredValue } = unifiedFilter();

	let selectedHistory = $derived.by(() =>
		getHistory()?.find((x) => x.timestamp === getSelectedHistory())
	);

	// Get the filtered value for a role
	function getRoleValue(role: { total: number; applied: number; notApplied: number }) {
		return getFilteredValue(role) ?? 0;
	}

	// Get the filtered value from history for a role
	function getHistoryRoleValue(index: number) {
		const historyRole = selectedHistory?.stats.registered.singleParticipants.byRole[index];
		if (!historyRole) return undefined;
		return getFilteredValue(historyRole);
	}
</script>

<section class="card border border-base-300 bg-base-200 col-span-2 md:col-span-12 xl:col-span-8">
	<div class="card-body p-4">
		<h2 class="card-title text-base font-semibold">
			<i class="fa-duotone fa-user-gear text-base-content/70"></i>
			{m.singleParticipants()}
		</h2>
		<div class="overflow-x-auto">
			<table class="table table-sm bg-base-100 rounded-lg">
				<thead>
					<tr>
						<th class="w-full text-xs">{m.role()}</th>
						<th class="text-center text-xs">{m.statsParticipants()}</th>
					</tr>
				</thead>
				<tbody>
					{#each stats?.registered.singleParticipants.byRole ?? [] as role, i}
						<tr>
							<td>
								<i class="fa-duotone fa-{role.fontAwesomeIcon?.replace('fa-', '')} mr-2 text-lg"
								></i>
								{role.role}
							</td>
							<td class="text-center">
								<span class="text-lg font-bold">
									{getRoleValue(role)}
								</span>
								{#if selectedHistory}
									<StatsDesc
										currentValue={getRoleValue(role)}
										historicValue={getHistoryRoleValue(i)}
									/>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
