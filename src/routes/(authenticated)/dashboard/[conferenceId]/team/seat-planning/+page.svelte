<script lang="ts">
	import Tab from '$lib/components/tabs/Tab.svelte';
	import Tabs from '$lib/components/tabs/Tabs.svelte';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import type { PageProps } from './$types';
	import { provideSeatPlanningParams } from './filters.svelte';
	import HintsSidebar from './HintsSidebar.svelte';
	import NonStateActorTable from './NonStateActorTable.svelte';
	import SeatMatrix from './SeatMatrix.svelte';
	import { createSeatPlanner } from './seatPlanner.svelte';
	import { createSizeLimitsStore } from './sizeLimits.svelte';

	let { params: routeParams }: PageProps = $props();

	// before the first `await`: the matrix, its filters and the sidebar read it from the context
	const params = provideSeatPlanningParams();

	const [conference, committees, nonStateActorRoles, assignments] = $derived(
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
				roles: { nation: { alpha2Code: true, alpha3Code: true } }
			}),
			client.liveQuery.conferenceRoles({
				__args: {
					where: {
						conferenceId: { eq: routeParams.conferenceId },
						kind: 'NON_STATE_ACTOR'
					},
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
				roles: { roleId: true, nationAlpha3Code: true, memberCount: true }
			})
		])
	);

	// A non-state actor's role always fills these columns; the shared role type cannot say so.
	const nonStateActors = $derived(
		nonStateActorRoles.map((role) => ({
			id: role.id,
			name: role.name ?? '',
			abbreviation: role.abbreviation ?? '',
			description: role.description ?? '',
			fontAwesomeIcon: role.fontAwesomeIcon ?? null,
			seatAmount: role.seatAmount ?? 0
		}))
	);

	const planner = createSeatPlanner(() => ({ committees, nonStateActors, assignments }));

	const sizeLimits = $derived(createSizeLimitsStore(routeParams.conferenceId));
	// the limits live in the browser storage, which the server cannot read
	$effect(() => sizeLimits.load());

</script>

<div class="flex w-full flex-col gap-4 py-4">
	{#if conference.state !== 'PRE'}
		<div role="alert" class="alert alert-warning">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-xl"></i>
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

	<div class="flex flex-col gap-4 xl:flex-row">
		<!-- the compact matrix keeps its own width so the hints sit right next to it; the NSA list
		     needs the room for its inputs -->
		<div class="flex min-h-0 min-w-0 grow flex-col">
			{#if params.tab === 'nsa'}
				<NonStateActorTable
					conferenceId={routeParams.conferenceId}
					{planner}
					{nonStateActors}
					{sizeLimits}
				/>
			{:else if committees.length === 0}
				<div class="alert alert-info">
					<i class="fa-sharp-duotone fa-solid fa-circle-info"></i>
					{m.seatPlanningNoCommittees()}
				</div>
			{:else}
				<SeatMatrix {planner} {committees} {sizeLimits} />
			{/if}
		</div>
		<aside class="shrink-0 xl:w-96">
			<HintsSidebar {planner} {committees} {nonStateActors} {sizeLimits} />
		</aside>
	</div>
</div>
