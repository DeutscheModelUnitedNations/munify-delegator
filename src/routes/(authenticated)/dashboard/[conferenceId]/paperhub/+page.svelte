<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { addToPanel } from 'svelte-inspect-value';
	import type { PageData } from './$houdini';
	import PaperEnum from '$lib/components/Paper/PaperEnum';
	import { type PaperType$options } from '$houdini';

	let { data }: { data: PageData } = $props();

	let paperQuery = $derived(data.GetMyPapersQuery);
	let paperQueryData = $derived($paperQuery?.data.findManyPapers);

	let isNSA = $derived(
		!!data.conferenceQueryData.findUniqueDelegationMember?.delegation.assignedNonStateActor
	);

	addToPanel('data', () => data);
	addToPanel('paperQuery', () => paperQueryData);
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
		<h2 class="text-2xl font-bold">{m.paperHub()}</h2>
		<p>{m.paperHubDescription()}</p>
	</div>
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
					'./paperhub/newPaper?type=WORKING_PAPER'
				)}
			{/if}
		</div>
	</div>

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
</div>
