<script lang="ts">
	import Tab from '$lib/components/Tabs/Tab.svelte';
	import Tabs from '$lib/components/Tabs/Tabs.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import { useSeatPlanningParams } from './filters';
	import HintsSidebar from './HintsSidebar.svelte';
	import NonStateActorTable from './NonStateActorTable.svelte';
	import SeatMatrix from './SeatMatrix.svelte';
	import { SeatPlanner } from './seatPlanner.svelte';
	import { SizeLimitsStore } from './sizeLimits.svelte';

	let { data }: { data: PageData } = $props();

	const query = $derived(data.SeatPlanningQuery);
	const conference = $derived($query.data?.findUniqueConference);
	const committees = $derived($query.data?.findManyCommittees ?? []);
	const nonStateActors = $derived($query.data?.findManyNonStateActors ?? []);

	const planner = new SeatPlanner(() => ({
		committees,
		nonStateActors,
		assignments: conference?.seatPlanningAssignments ?? { committeeSeats: [], roles: [] }
	}));

	const sizeLimits = $derived(new SizeLimitsStore(data.conferenceId));
	// the limits live in the browser storage, which the server cannot read
	$effect(() => sizeLimits.load());

	const params = useSeatPlanningParams();
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-4 py-4">
	<h2 class="text-2xl font-bold">
		<i class="fa-duotone fa-table-cells"></i>
		{m.seatPlanning()}
	</h2>

	{#if conference && conference.state !== 'PRE'}
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
			active={$params.tab !== 'nsa'}
			onclick={() => ($params.tab = 'states')}
		/>
		<Tab
			title={m.nonStateActors()}
			icon="hand-point-up"
			active={$params.tab === 'nsa'}
			onclick={() => ($params.tab = 'nsa')}
		/>
	</Tabs>

	<div class="flex min-h-0 grow flex-col gap-4 xl:flex-row">
		<div class="min-h-0 min-w-0 grow">
			{#if $params.tab === 'nsa'}
				<NonStateActorTable
					conferenceId={data.conferenceId}
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
		<aside class="shrink-0 overflow-y-auto xl:w-80">
			<HintsSidebar {planner} {committees} {nonStateActors} {sizeLimits} />
		</aside>
	</div>
</div>
