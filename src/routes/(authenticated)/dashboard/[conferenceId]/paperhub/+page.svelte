<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import PaperEnum from '$lib/components/Paper/PaperEnum';
	import { type PaperType$options } from '$houdini';
	import PaperHubOverview from './PaperHubOverview.svelte';
	import SupervisorPaperHubView from './SupervisorPaperHubView.svelte';
	import GlobalPapersView from './GlobalPapersView.svelte';
	import { queryParam } from 'sveltekit-search-params';

	let { data }: { data: PageData } = $props();

	let paperQuery = $derived(data.GetMyPapersQuery);
	let paperQueryData = $derived($paperQuery?.data?.findManyPapers);

	// Check if user is team member with review access (data comes from layout load)
	let isTeamMember = $derived((data.teamMembers?.length ?? 0) > 0);

	// Check if user is a supervisor with supervised students
	let isSupervisor = $derived(!!data.supervisor && (data.supervisedDelegationIds?.length ?? 0) > 0);

	// Check if user is a paper author (only delegation members can submit papers)
	let isPaperAuthor = $derived(!!data.conferenceQueryData?.findUniqueDelegationMember);

	// Check if user is a single participant (they can only view papers, not submit)
	let isSingleParticipant = $derived(
		!!data.conferenceQueryData?.findUniqueSingleParticipant &&
			!data.conferenceQueryData?.findUniqueDelegationMember
	);

	// Check if user is a participant (delegation member, single participant, or supervisor)
	let isParticipant = $derived(
		!!data.conferenceQueryData?.findUniqueDelegationMember ||
			!!data.conferenceQueryData?.findUniqueSingleParticipant ||
			!!data.conferenceQueryData?.findUniqueConferenceSupervisor
	);

	// View toggle state persisted in URL search params
	const validViews = ['participant', 'team', 'supervisor', 'global'] as const;
	type ViewType = (typeof validViews)[number];
	const viewParam = queryParam('view');
	let viewToggle = $derived<ViewType>(
		validViews.includes($viewParam as ViewType) ? ($viewParam as ViewType) : 'participant'
	);

	// Effective view based on user roles
	let currentView = $derived.by(() => {
		// Single participants only see global view - no toggle needed
		if (isSingleParticipant && !isTeamMember && !isSupervisor) return 'global';

		// Respect viewToggle if the user has access to that view
		if (viewToggle === 'team' && isTeamMember) return 'team';
		if (viewToggle === 'supervisor' && isSupervisor) return 'supervisor';
		if (viewToggle === 'global' && isParticipant) return 'global';
		if (viewToggle === 'participant' && isPaperAuthor) return 'participant';

		// Default views for users who don't have access to their selected view
		if (isPaperAuthor) return 'participant';
		if (isSupervisor) return 'supervisor';
		if (isTeamMember) return 'team';
		return 'global'; // participant without paper authoring ability
	});

	// Determine which view toggle buttons to show
	// Single participants only see global view - no toggle needed
	// Show toggle if user has multiple roles or can switch between views
	let showViewToggle = $derived(
		!isSingleParticipant &&
			((isTeamMember && isParticipant) ||
				(isTeamMember && isSupervisor) ||
				isSupervisor || // Supervisors can switch between supervisor and global views
				isPaperAuthor) // Paper authors can switch between my papers and global
	);

	let isNSA = $derived(
		!!data.conferenceQueryData?.findUniqueDelegationMember?.delegation?.assignedNonStateActor
	);
</script>

{#snippet PaperTypeBlock(paperType: PaperType$options, description: string, href: string)}
	<div class="card w-full bg-base-300 shadow-md flex flex-col items-center p-4 gap-4">
		<PaperEnum.Type type={paperType} size="md" />
		<p class="text-sm text-center">{description}</p>
		<a class="btn btn-primary border-b border-base-300" {href}>
			<i class="fas fa-plus mr-2"></i>
			{m.paperCreateNew()}
		</a>
	</div>
{/snippet}

<div class="flex flex-col gap-6 w-full">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.paperHub()}</h2>
		<p>{m.paperHubDescription()}</p>

		{#if showViewToggle}
			<div role="tablist" class="tabs tabs-border mt-2">
				{#if isPaperAuthor}
					<button
						role="tab"
						class="tab"
						class:tab-active={viewToggle === 'participant'}
						onclick={() => ($viewParam = 'participant')}
					>
						<i class="fa-solid fa-file-lines mr-1"></i>
						{m.myPapers()}
					</button>
				{/if}
				{#if isSupervisor}
					<button
						role="tab"
						class="tab"
						class:tab-active={currentView === 'supervisor'}
						onclick={() => ($viewParam = 'supervisor')}
					>
						<i class="fa-solid fa-chalkboard-user mr-1"></i>
						{m.supervisorView()}
					</button>
				{/if}
				{#if isTeamMember}
					<button
						role="tab"
						class="tab"
						class:tab-active={currentView === 'team'}
						onclick={() => ($viewParam = 'team')}
					>
						<i class="fa-solid fa-user-group mr-1"></i>
						{m.teamView()}
					</button>
				{/if}
				{#if isParticipant}
					<button
						role="tab"
						class="tab"
						class:tab-active={currentView === 'global'}
						onclick={() => ($viewParam = 'global')}
					>
						<i class="fa-solid fa-globe mr-1"></i>
						{m.conferencePapers()}
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if currentView === 'team' && isTeamMember}
		<PaperHubOverview conferenceId={data.conferenceId} />
	{:else if currentView === 'supervisor' && isSupervisor}
		<SupervisorPaperHubView conferenceId={data.conferenceId} />
	{:else if currentView === 'global' && isParticipant}
		<GlobalPapersView conferenceId={data.conferenceId} />
	{:else}
		{#if paperQueryData && paperQueryData.length > 0}
			<div class="w-full flex flex-col bg-base-200 p-4 rounded-box">
				<h3 class="text-xl">{m.yourPapers()}</h3>
				<div class="overflow-x-auto w-full">
					<table class="table table-sm w-full">
						<thead>
							<tr>
								<th class="w-0">{m.paperType()}</th>
								<th class="w-0">{m.paperStatus()}</th>
								<th>{m.paperTopic()}</th>
								<th class="w-0 whitespace-nowrap">{m.paperCreatedAt()}</th>
								<th class="w-0 whitespace-nowrap">{m.paperUpdatedAt()}</th>
								<th class="w-0 whitespace-nowrap">{m.submittedAt()}</th>
								<th class="w-0"></th>
							</tr>
						</thead>
						<tbody>
							{#each paperQueryData as paper}
								<tr>
									<td class="align-middle">
										<PaperEnum.Type type={paper.type} size="xs" />
									</td>
									<td class="align-middle">
										<PaperEnum.Status status={paper.status} size="xs" />
									</td>
									<td class="align-middle">
										{#if paper.type !== 'INTRODUCTION_PAPER'}
											{paper.agendaItem?.title}
										{/if}
									</td>
									<td class="align-middle whitespace-nowrap text-base-content/60">
										{new Date(paper.createdAt).toLocaleDateString()}
									</td>
									<td class="align-middle whitespace-nowrap text-base-content/60">
										{new Date(paper.updatedAt).toLocaleDateString()}
									</td>
									<td class="align-middle whitespace-nowrap">
										{#if paper.firstSubmittedAt}
											{new Date(paper.firstSubmittedAt).toLocaleDateString()}
										{:else}
											<span class="text-base-content/40">{m.notYetSubmitted()}</span>
										{/if}
									</td>
									<td class="align-middle">
										<a href="./paperhub/{paper.id}" class="btn btn-primary btn-sm">
											{m.openPaper()}
											<i class="fas fa-arrow-right"></i>
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<div class="w-full flex flex-col bg-base-200 p-4 rounded-box">
			<h3 class="text-xl">{m.submitAPaper()}</h3>

			<div class="flex flex-col md:flex-row justify-center md:justify-start gap-4 mt-4">
				{#if isNSA}
					{@render PaperTypeBlock(
						'INTRODUCTION_PAPER',
						m.paperTypeIntroductionPaperDescription(),
						'./paperhub/newPaper?type=INTRODUCTION_PAPER'
					)}
				{/if}

				{@render PaperTypeBlock(
					'POSITION_PAPER',
					m.paperTypePositionPaperDescription(),
					'./paperhub/newPaper?type=POSITION_PAPER'
				)}

				{#if !isNSA}
					{@render PaperTypeBlock(
						'WORKING_PAPER',
						m.paperTypeWorkingPaperDescription(),
						'./paperhub/newResolution'
					)}
				{/if}
			</div>
		</div>
	{/if}
</div>
