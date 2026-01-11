<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { PageData } from './$houdini';
	import PaperEnum from '$lib/components/Paper/PaperEnum';
	import { type PaperType$options } from '$houdini';
	import PaperHubOverview from './PaperHubOverview.svelte';

	let { data }: { data: PageData } = $props();

	let paperQuery = $derived(data.GetMyPapersQuery);
	let paperQueryData = $derived($paperQuery?.data?.findManyPapers);

	// Check if user is team member with review access (data comes from layout load)
	let isTeamMember = $derived((data.teamMembers?.length ?? 0) > 0);

	// Check if user is a participant (delegation member, single participant, or supervisor)
	let isParticipant = $derived(
		!!data.conferenceQueryData?.findUniqueDelegationMember ||
			!!data.conferenceQueryData?.findUniqueSingleParticipant ||
			!!data.conferenceQueryData?.findUniqueConferenceSupervisor
	);

	// View toggle state - only used when user is both team member AND participant
	let viewToggle = $state<'participant' | 'team'>('participant');

	// Effective view: team-only members always see team view
	let currentView = $derived<'participant' | 'team'>(
		isTeamMember && !isParticipant ? 'team' : viewToggle
	);

	let isNSA = $derived(
		!!data.conferenceQueryData?.findUniqueDelegationMember?.delegation?.assignedNonStateActor
	);
</script>

{#snippet PaperTypeBlock(paperType: PaperType$options, description: string, href: string)}
	<div class="card w-full bg-base-300 shadow-md flex flex-col items-center p-4 gap-4">
		<PaperEnum.Type type={paperType} vertical />
		<p class="text-sm text-center">{description}</p>
		<a class="btn btn-primary border-b border-base-300" {href}>
			<i class="fas fa-plus mr-2"></i>
			{m.paperCreateNew()}
		</a>
	</div>
{/snippet}

<div class="flex flex-col gap-6 w-full">
	<div class="flex flex-col gap-2">
		<div class="flex justify-between items-center">
			<h2 class="text-2xl font-bold">{m.paperHub()}</h2>

			{#if isTeamMember && isParticipant}
				<div class="btn-group">
					<button
						class="btn btn-sm"
						class:btn-active={viewToggle === 'participant'}
						onclick={() => (viewToggle = 'participant')}
					>
						<i class="fa-solid fa-user"></i>
						{m.participantView()}
					</button>
					<button
						class="btn btn-sm"
						class:btn-active={viewToggle === 'team'}
						onclick={() => (viewToggle = 'team')}
					>
						<i class="fa-solid fa-user-group"></i>
						{m.teamView()}
					</button>
				</div>
			{/if}
		</div>
		<p>{m.paperHubDescription()}</p>
	</div>

	{#if currentView === 'team' && isTeamMember}
		<PaperHubOverview conferenceId={data.conferenceId} />
	{:else}
		{#if paperQueryData && paperQueryData.length > 0}
			<div class="w-full flex flex-col bg-base-200 p-4 rounded-box">
				<h3 class="text-xl">{m.yourPapers()}</h3>
				<div class="overflow-x-auto w-full">
					<table class="table w-full">
						<thead>
							<tr>
								<th>{m.paperType()}</th>
								<th>{m.paperStatus()}</th>
								<th>{m.paperTopic()}</th>
								<th>{m.paperCreatedAt()}</th>
								<th>{m.paperUpdatedAt()}</th>
								<th>{m.submittedAt()}</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each paperQueryData as paper}
								<tr>
									<td>
										<PaperEnum.Type type={paper.type} />
									</td>
									<td>
										<PaperEnum.Status status={paper.status} />
									</td>
									<td>
										{#if paper.type !== 'INTRODUCTION_PAPER'}
											{paper.agendaItem?.title}
										{/if}
									</td>
									<td>{new Date(paper.createdAt).toLocaleDateString()}</td>
									<td>{new Date(paper.updatedAt).toLocaleDateString()}</td>
									<td>
										{#if paper.firstSubmittedAt}
											{new Date(paper.firstSubmittedAt).toLocaleDateString()}
										{:else}
											{m.notYetSubmitted()}
										{/if}
									</td>
									<td>
										<a href="./paperhub/{paper.id}" class="btn btn-primary">
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
			<div class="alert alert-warning mt-4">
				<i class="fa-solid fa-construction text-3xl"></i>
				<span>{m.resolutionEditorNotYetAvailable()}</span>
			</div>

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
						'./paperhub/newPaper?type=WORKING_PAPER'
					)}
				{/if}
			</div>
		</div>
	{/if}
</div>
