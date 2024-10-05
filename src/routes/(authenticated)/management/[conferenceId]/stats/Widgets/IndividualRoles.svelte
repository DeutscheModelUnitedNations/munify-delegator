<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { getStats, registrationFilter, getHistory, getSelectedHistory } from '../stats.svelte';
	import StatsDesc from './StatsDesc.svelte';

	let stats = getStats();

	let { getFilter } = registrationFilter();

	let selectedHistory = $derived(() =>
		getHistory()?.find((x) => x.timestamp === getSelectedHistory())
	);
</script>

<section class="col-span-2 md:col-span-12 xl:col-span-9 card bg-base-200 shadow-sm">
	<div class="card-body">
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th class="w-full">{m.role()}</th>
						<th class="text-center">
							<i class="fa-duotone fa-sigma"></i>
						</th>
						<th class="text-center">
							<i class="fa-duotone fa-check"></i>
						</th>
						<th class="text-center">
							<i class="fa-duotone fa-hourglass-half"></i>
						</th>
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
							<td
								class="{getFilter() === 'all' &&
									'bg-base-300'} transition-all duration-500 text-center"
							>
								<span class="font-bold text-lg">
									{role.total}
								</span>
								{#if selectedHistory()}
									<StatsDesc
										currentValue={role.total}
										historicValue={selectedHistory()?.stats.registered.singleParticipants.byRole[i]
											.total}
									/>
								{/if}
							</td>
							<td
								class="{getFilter() === 'applied' &&
									'bg-base-300'} transition-all duration-500 text-center"
							>
								<span class="font-bold text-lg">
									{role.applied}
								</span>
								{#if selectedHistory()}
									<StatsDesc
										currentValue={role.applied}
										historicValue={selectedHistory()?.stats.registered.singleParticipants.byRole[i]
											.applied}
									/>
								{/if}
							</td>
							<td
								class="{getFilter() === 'notApplied' &&
									'bg-base-300'} transition-all duration-500 text-center"
							>
								<span class="font-bold text-lg">
									{role.notApplied}
								</span>
								{#if selectedHistory()}
									<StatsDesc
										currentValue={role.notApplied}
										historicValue={selectedHistory()?.stats.registered.singleParticipants.byRole[i]
											.notApplied}
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
