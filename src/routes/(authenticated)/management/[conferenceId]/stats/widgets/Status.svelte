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
</script>

<section class="card bg-base-200 col-span-2 shadow-sm md:col-span-12">
	<div class="card-body">
		<div class="overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th class="w-full">{m.status()}</th>
						<th class="text-center">
							<i class="fas fa-triangle-exclamation text-error"></i>
						</th>
						<th class="text-center">
							<i class="fas fa-check text-success"></i>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<i class="fa-duotone fa-envelopes-bulk mr-2 text-lg"></i>
							{m.postalRegistration()}
						</td>
						<td class="text-center">
							<span class="text-lg font-bold"> {stats.status.postalStatus.problem} </span>
							{#if selectedHistory}
								<StatsDesc
									currentValue={stats.status.postalStatus.problem}
									historicValue={selectedHistory?.stats.status?.postalStatus.problem}
								/>
							{/if}
						</td>
						<td class="text-center">
							<span class="text-lg font-bold">{stats.status.postalStatus.done}</span>
							{#if selectedHistory}
								<StatsDesc
									currentValue={stats.status.postalStatus.done}
									historicValue={selectedHistory?.stats.status?.postalStatus.done}
								/>
							{/if}
						</td>
					</tr>
					<tr>
						<td>
							<i class="fa-duotone fa-hand-holding-circle-dollar mr-2 text-lg"></i>
							{m.payment()}
						</td>
						<td class="text-center">
							<span class="text-lg font-bold"> {stats.status.paymentStatus.problem} </span>
							{#if selectedHistory}
								<StatsDesc
									currentValue={stats.status.paymentStatus.problem}
									historicValue={selectedHistory?.stats.status?.paymentStatus.problem}
								/>
							{/if}
						</td>
						<td class="text-center">
							<span class="text-lg font-bold">{stats.status.paymentStatus.done}</span>
							{#if selectedHistory}
								<StatsDesc
									currentValue={stats.status.paymentStatus.done}
									historicValue={selectedHistory?.stats.status?.paymentStatus.done}
								/>
							{/if}
						</td>
					</tr>
					<tr>
						<td>
							<i class="fa-duotone fa-file-certificate mr-2 text-lg"></i>
							{m.attendance()}
						</td>
						<td class="text-center"><i class="fa-duotone fa-slash"></i></td>
						<td class="text-center">
							<span class="text-lg font-bold">{stats.status.didAttend}</span>
							{#if selectedHistory}
								<StatsDesc
									currentValue={stats.status.didAttend}
									historicValue={selectedHistory?.stats.status?.didAttend}
								/>
							{/if}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</section>
