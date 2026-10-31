<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import PaperEnum from '#lib/components/paper/paperEnum/index';
	import type { PaperstatusEnum, PapertypeEnum } from '#lib/api/rumbleClient/client';

	/** The caller's papers as one tappable row each, the phone layout of the "your papers" table. */
	interface Props {
		papers: {
			id: string;
			type: PapertypeEnum;
			status: PaperstatusEnum;
			updatedAt: Date;
			agendaItem?: { title: string } | null;
		}[];
		conferenceId: string;
	}

	let { papers, conferenceId }: Props = $props();
</script>

<ul class="sm:hidden mt-2 flex flex-col divide-y divide-base-300">
	{#each papers as paper (paper.id)}
		<li>
			<a
				href={resolve(`dashboard/${conferenceId}/paperhub/${paper.id}`)}
				class="flex items-center gap-3 py-3"
			>
				<div class="flex min-w-0 grow flex-col gap-1">
					<div class="flex flex-wrap items-center gap-2">
						<PaperEnum.Type type={paper.type} size="xs" />
						<PaperEnum.Status status={paper.status} size="xs" />
					</div>
					{#if paper.type !== 'INTRODUCTION_PAPER' && paper.agendaItem}
						<span class="text-sm break-words">{paper.agendaItem.title}</span>
					{/if}
					<span class="text-xs text-base-content/60">
						{m.paperUpdatedAt()}: {new Date(paper.updatedAt).toLocaleDateString(getLocale())}
					</span>
				</div>
				<i class="fa-sharp-duotone fa-solid fa-chevron-right text-base-content/40"></i>
			</a>
		</li>
	{/each}
</ul>
