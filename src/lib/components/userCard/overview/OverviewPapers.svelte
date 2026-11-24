<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { translatePaperStatus, translatePaperType } from '#lib/utils/enumTranslations';
	import { fetchPapers, paperStatusBadge } from '../tabs/papers';

	/** The person's papers and how far each of them is. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();

	const papers = $derived(await fetchPapers({ userId, conferenceId }));
</script>

{#if papers.length === 0}
	<p class="text-base-content/60 italic">{m.userCardNoPapers()}</p>
{:else}
	<ul class="divide-base-300 flex flex-col divide-y">
		{#each papers as paper (paper.id)}
			<li class="flex items-center justify-between gap-2 py-1">
				<span class="flex min-w-0 flex-col">
					<span>{translatePaperType(paper.type)}</span>
					{#if paper.agendaItem}
						<span class="text-base-content/60 truncate text-xs">{paper.agendaItem.title}</span>
					{/if}
				</span>
				<span class="badge badge-sm {paperStatusBadge(paper.status)}">
					{translatePaperStatus(paper.status)}
				</span>
			</li>
		{/each}
	</ul>
{/if}
