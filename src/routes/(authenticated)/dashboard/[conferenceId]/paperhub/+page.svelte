<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { fetchMyPaperHubRoles } from './myPaperHubRoles';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import PaperHubOverview from './PaperHubOverview.svelte';
	import SupervisorPaperHubView from './SupervisorPaperHubView.svelte';
	import GlobalPapersView from './GlobalPapersView.svelte';
	import ParticipantPaperView from './ParticipantPaperView.svelte';
	import { queryParameters } from 'sveltekit-search-params';
	import {
		effectivePaperHubView,
		isPaperHubView,
		paperHubAccess,
		showPaperHubViewToggle,
		type PaperHubView
	} from './paperHubViews';
	import type { PageProps } from './$types';

	let { params: routeParams }: PageProps = $props();

	const [participation, myRoles] = $derived(
		await Promise.all([
			fetchMyParticipation(routeParams.conferenceId),
			fetchMyPaperHubRoles(routeParams.conferenceId)
		])
	);

	let access = $derived(paperHubAccess(participation, myRoles));
	let isTeamMember = $derived(access.isTeamMember);
	let isSupervisor = $derived(access.isSupervisor);
	let isParticipant = $derived(access.isParticipant);
	let isPaperAuthor = $derived(access.isPaperAuthor);

	// View toggle state persisted in URL search params
	const params = queryParameters({ view: true });
	let viewToggle = $derived<PaperHubView>(
		isPaperHubView(params.view) ? params.view : 'participant'
	);

	// Effective view based on user roles
	let currentView = $derived(effectivePaperHubView(access, viewToggle));

	// Single participants only see the global view; everyone else gets tabs for their views
	let showViewToggle = $derived(showPaperHubViewToggle(access));

	// The tabs, in order, and whether this user can see each view
	let viewTabs = $derived([
		{ view: 'participant', available: isPaperAuthor, icon: 'fa-file-lines', label: m.myPapers },
		{
			view: 'supervisor',
			available: isSupervisor,
			icon: 'fa-chalkboard-user',
			label: m.supervisorView
		},
		{ view: 'team', available: isTeamMember, icon: 'fa-user-group', label: m.teamView },
		{ view: 'global', available: isParticipant, icon: 'fa-globe', label: m.conferencePapers }
	] satisfies { view: PaperHubView; available: boolean; icon: string; label: () => string }[]);

	let isNSA = $derived(!!participation?.delegationMember?.delegation?.assignedNonStateActor);
</script>

<div class="flex flex-col gap-6 w-full">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.paperHub()}</h2>
		<p>{m.paperHubDescription()}</p>

		{#if showViewToggle}
			<div role="tablist" class="tabs tabs-border mt-2">
				{#each viewTabs.filter((tab) => tab.available) as tab (tab.view)}
					<button
						role="tab"
						class="tab"
						class:tab-active={currentView === tab.view}
						onclick={() => (params.view = tab.view)}
					>
						<i class="fa-solid {tab.icon} mr-1"></i>
						{tab.label()}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if currentView === 'team' && isTeamMember}
		<PaperHubOverview conferenceId={routeParams.conferenceId} />
	{:else if currentView === 'supervisor' && isSupervisor}
		<SupervisorPaperHubView conferenceId={routeParams.conferenceId} />
	{:else if currentView === 'global' && isParticipant}
		<GlobalPapersView conferenceId={routeParams.conferenceId} />
	{:else}
		<ParticipantPaperView conferenceId={routeParams.conferenceId} {isNSA} />
	{/if}
</div>
