<script lang="ts">
	import { getLocale } from '$lib/paraglide/runtime';
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
					author: { id: { eq: currentUser.sub } },
					conference: { id: { eq: conferenceId } }
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
	<div
		class="card w-full bg-base-100 border border-base-content/10 rounded-box flex flex-col items-start p-5 gap-3 transition-colors hover:border-primary/40"
	>
		<PaperEnum.Type type={paperType} size="md" />
		<p class="text-sm text-base-content/70 leading-relaxed grow">{description}</p>
		<a class="btn btn-primary btn-sm mt-1" {href}>
			<i class="fa-sharp-duotone fa-solid fa-plus"></i>
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
								{new Date(paper.createdAt).toLocaleDateString(getLocale())}
							</td>
							<td class="align-middle whitespace-nowrap text-base-content/60">
								{new Date(paper.updatedAt).toLocaleDateString(getLocale())}
							</td>
							<td class="align-middle whitespace-nowrap">
								{#if paper.firstSubmittedAt}
									{new Date(paper.firstSubmittedAt).toLocaleDateString(getLocale())}
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

	<div class="grid grid-cols-1 md:grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4 mt-4">
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
