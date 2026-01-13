<script lang="ts">
	import type { PaperStatus$options, PaperType$options } from '$houdini';
	import PaperEnum from '$lib/components/Paper/PaperEnum';
	import { m } from '$lib/paraglide/messages';

	interface Paper {
		id: string;
		status: PaperStatus$options;
		type: PaperType$options;
		firstSubmittedAt?: Date | string | null;
		agendaItem?: { id: string; title: string } | null;
	}

	interface Props {
		papers: Paper[];
		conferenceId: string;
	}

	let { papers, conferenceId }: Props = $props();

	let expanded = $state(false);

	let statusCounts = $derived({
		submitted: papers.filter((p) => p.status === 'SUBMITTED').length,
		changesRequested: papers.filter((p) => p.status === 'CHANGES_REQUESTED').length,
		accepted: papers.filter((p) => p.status === 'ACCEPTED').length
	});

	let hasPapers = $derived(papers.length > 0);
</script>

{#if hasPapers}
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2 flex-wrap">
				<span class="font-medium text-sm">{m.supervisorPapers()}:</span>
				<span class="badge badge-sm">{papers.length}</span>
				{#if statusCounts.submitted > 0}
					<span class="badge badge-warning badge-sm gap-1">
						<i class="fa-solid fa-paper-plane text-xs"></i>
						{statusCounts.submitted}
					</span>
				{/if}
				{#if statusCounts.changesRequested > 0}
					<span class="badge badge-error badge-sm gap-1">
						<i class="fa-solid fa-pen text-xs"></i>
						{statusCounts.changesRequested}
					</span>
				{/if}
				{#if statusCounts.accepted > 0}
					<span class="badge badge-success badge-sm gap-1">
						<i class="fa-solid fa-check text-xs"></i>
						{statusCounts.accepted}
					</span>
				{/if}
			</div>
			<button
				class="btn btn-ghost btn-xs"
				onclick={() => (expanded = !expanded)}
				aria-label={expanded ? 'Collapse papers' : 'Expand papers'}
			>
				{#if expanded}
					<i class="fa-solid fa-chevron-up"></i>
				{:else}
					<i class="fa-solid fa-chevron-down"></i>
				{/if}
			</button>
		</div>

		{#if expanded}
			<div class="overflow-x-auto">
				<table class="table table-sm w-full">
					<thead>
						<tr>
							<th>{m.paperType()}</th>
							<th>{m.paperStatus()}</th>
							<th>{m.paperTopic()}</th>
							<th>{m.submittedAt()}</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each papers as paper (paper.id)}
							<tr class="hover">
								<td>
									<PaperEnum.Type type={paper.type} />
								</td>
								<td>
									<PaperEnum.Status status={paper.status} />
								</td>
								<td class="max-w-48 truncate">
									{#if paper.agendaItem}
										{paper.agendaItem.title}
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td>
									{#if paper.firstSubmittedAt}
										{new Date(paper.firstSubmittedAt).toLocaleDateString()}
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td>
									<a
										href="/dashboard/{conferenceId}/paperhub/{paper.id}"
										class="btn btn-ghost btn-xs"
										aria-label={m.openPaper()}
									>
										<i class="fa-solid fa-arrow-right"></i>
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
{:else}
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<i class="fa-solid fa-file-lines"></i>
		<span>{m.supervisorPapersEmpty()}</span>
	</div>
{/if}
