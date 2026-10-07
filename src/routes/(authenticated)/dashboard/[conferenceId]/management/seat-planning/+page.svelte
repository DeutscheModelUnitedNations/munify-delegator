<script lang="ts">
	import Tab from '$lib/components/tabs/Tab.svelte';
	import Tabs from '$lib/components/tabs/Tabs.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import type { PageProps } from './$types';
	import { useSeatPlanningParams } from './filters';
	import HintsSidebar from './HintsSidebar.svelte';
	import NonStateActorTable from './NonStateActorTable.svelte';
	import SeatMatrix from './SeatMatrix.svelte';
	import { SeatPlanner } from './seatPlanner.svelte';
	import { SizeLimitsStore } from './sizeLimits.svelte';

	let { params: routeParams }: PageProps = $props();

	const [conference, committees, nonStateActors, assignments] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: routeParams.conferenceId },
				state: true
			}),
			client.liveQuery.committees({
				__args: {
					where: { conferenceId: { eq: routeParams.conferenceId } },
					orderBy: { createdAt: 'asc' }
				},
				id: true,
				name: true,
				abbreviation: true,
				numOfSeatsPerDelegation: true,
				regionalBaseline: true,
				regionalBaselineTargets: true,
				nations: { alpha2Code: true, alpha3Code: true }
			}),
			client.liveQuery.nonStateActors({
				__args: {
					where: { conferenceId: { eq: routeParams.conferenceId } },
					orderBy: { createdAt: 'asc' }
				},
				id: true,
				name: true,
				abbreviation: true,
				description: true,
				fontAwesomeIcon: true,
				seatAmount: true
			}),
			client.liveQuery.seatPlanningAssignments({
				__args: { conferenceId: routeParams.conferenceId },
				committeeSeats: { committeeId: true, nationAlpha3Code: true, memberNames: true },
				roles: { nationAlpha3Code: true, nonStateActorId: true, memberCount: true }
			})
		])
	);

	const planner = new SeatPlanner(() => ({ committees, nonStateActors, assignments }));

	const sizeLimits = $derived(new SizeLimitsStore(routeParams.conferenceId));
	// the limits live in the browser storage, which the server cannot read
	$effect(() => sizeLimits.load());

	const params = useSeatPlanningParams();
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-4 py-4">
	{#if conference.state !== 'PRE'}
		<div role="alert" class="alert alert-warning">
			<i class="fa-duotone fa-triangle-exclamation text-xl"></i>
			<div>
				<h3 class="font-bold">{m.seatPlanningLiveWarningTitle()}</h3>
				<p class="text-sm">{m.seatPlanningLiveWarning()}</p>
			</div>
		</div>
	{/if}

	<Tabs>
		<Tab
			title={m.seatPlanningStatesTab()}
			icon="flag"
			active={params.tab !== 'nsa'}
			onclick={() => (params.tab = null)}
		/>
		<Tab
			title={m.nonStateActors()}
			icon="hand-point-up"
			active={params.tab === 'nsa'}
			onclick={() => (params.tab = 'nsa')}
		/>
	</Tabs>

	<div class="flex min-h-0 grow flex-col gap-4 xl:flex-row">
		<!-- the compact matrix keeps its own width so the hints sit right next to it; the NSA list
		     needs the room for its inputs -->
		<div class="min-h-0 min-w-0 {params.tab === 'nsa' ? 'grow' : ''}">
			{#if params.tab === 'nsa'}
				<NonStateActorTable
					conferenceId={routeParams.conferenceId}
					{planner}
					{nonStateActors}
					{sizeLimits}
				/>
			{:else if committees.length === 0}
				<div class="alert alert-info">
					<i class="fa-duotone fa-circle-info"></i>
					{m.seatPlanningNoCommittees()}
				</div>
			{:else}
				<SeatMatrix {planner} {committees} {sizeLimits} />
			{/if}
		</div>
		<aside class="shrink-0 overflow-y-auto xl:w-96">
			<HintsSidebar {planner} {committees} {nonStateActors} {sizeLimits} />
		</aside>
	</div>
</div>
