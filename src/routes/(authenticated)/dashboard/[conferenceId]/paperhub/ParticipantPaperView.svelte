<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import PaperEnum from '$lib/components/paper/paperEnum';
	import PaperTypeStatusColumns from './PaperTypeStatusColumns.svelte';
	import { client, type PapertypeEnum } from '$lib/api/rumbleClient/client';
	import type { ResolvedPathname } from '$app/types';

	interface Props {
		conferenceId: string;
		/** Non-state actors write introduction papers instead of working papers. */
		isNSA: boolean;
	}

	let { conferenceId, isNSA }: Props = $props();

	const currentUser = $derived(await getCurrentUser());

	// The caller's own papers in this conference
	const paperQueryData = $derived(
		await client.liveQuery.papers({
			__args: {
				where: {
					authorId: { eq: currentUser.sub },
					conferenceId: { eq: conferenceId }
				}
			},
			id: true,
			status: true,
			type: true,
			createdAt: true,
			updatedAt: true,
			firstSubmittedAt: true,
			agendaItem: { id: true, title: true }
		})
	);
</script>

{#snippet PaperTypeBlock(paperType: PapertypeEnum, description: string, href: ResolvedPathname)}
	<div class="card w-full bg-base-300 shadow-md flex flex-col items-center p-4 gap-4">
		<PaperEnum.Type type={paperType} size="md" />
		<p class="text-sm text-center">{description}</p>
		<a class="btn btn-primary border-b border-base-300" {href}>
			<i class="fas fa-plus mr-2"></i>
			{m.paperCreateNew()}
		</a>
	</div>
{/snippet}

{#if paperQueryData && paperQueryData.length > 0}
	<div class="w-full flex flex-col bg-base-200 p-4 rounded-box">
		<h3 class="text-xl">{m.yourPapers()}</h3>
		<div class="overflow-x-auto w-full">
			<table class="table table-sm w-full">
				<thead>
					<tr>
						<PaperTypeStatusColumns />
						<th>{m.paperTopic()}</th>
						<th class="w-0 whitespace-nowrap">{m.paperCreatedAt()}</th>
						<th class="w-0 whitespace-nowrap">{m.paperUpdatedAt()}</th>
						<th class="w-0 whitespace-nowrap">{m.submittedAt()}</th>
						<th class="w-0"></th>
					</tr>
				</thead>
				<tbody>
					{#each paperQueryData as paper (paper.id)}
						<tr>
							<PaperTypeStatusColumns {paper} />
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
								<a
									href={resolve(`/dashboard/${conferenceId}/paperhub/${paper.id}`)}
									class="btn btn-primary btn-sm"
								>
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
				resolve(`/dashboard/${conferenceId}/paperhub/newPaper?type=INTRODUCTION_PAPER`)
			)}
		{/if}

		{@render PaperTypeBlock(
			'POSITION_PAPER',
			m.paperTypePositionPaperDescription(),
			resolve(`/dashboard/${conferenceId}/paperhub/newPaper?type=POSITION_PAPER`)
		)}

		{#if !isNSA}
			{@render PaperTypeBlock(
				'WORKING_PAPER',
				m.paperTypeWorkingPaperDescription(),
				resolve(`/dashboard/${conferenceId}/paperhub/newResolution`)
			)}
		{/if}
	</div>
</div>
