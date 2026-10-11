<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import type { ResolvedPathname } from '$app/types';
	import Flag from '$lib/components/Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import type { PapertypeEnum } from '$lib/api/rumbleClient/client';
	import PaperMatrixCell from './PaperMatrixCell.svelte';
	import { matrixRows } from './paperMatrixRows';

	interface Paper {
		id: string;
		type: PapertypeEnum;
		firstSubmittedAt: Date | null;
		delegation: {
			id: string;
			assignedNation: { alpha2Code: string; alpha3Code: string } | null;
			assignedNonStateActor: { name: string; fontAwesomeIcon: string | null } | null;
		};
	}

	/**
	 * Delegations (rows) against agenda items (columns). A cell holds that delegation's papers on
	 * the topic, each a link to the paper; delegations without any paper in `columns` get no row.
	 */
	interface Props {
		columns: { id: string; title: string; papers: Paper[] }[];
		/** Where a paper leads; already passed through `resolve()`. */
		paperHref: (paperId: string) => ResolvedPathname;
	}

	let { columns, paperHref }: Props = $props();

	const nameOf = ({ delegation }: Paper) =>
		delegation.assignedNation
			? getFullTranslatedCountryNameFromISO3Code(delegation.assignedNation.alpha3Code)
			: (delegation.assignedNonStateActor?.name ?? '');

	const rows = $derived(matrixRows<Paper['delegation'], Paper>(columns, nameOf));
</script>

<div class="overflow-x-auto">
	<table class="table table-sm">
		<thead>
			<tr class="text-xs align-bottom">
				<th class="sticky left-0 z-10 bg-base-100 min-w-44">{m.country()}</th>
				{#each columns as column (column.id)}
					<th class="min-w-32 max-w-56 text-center whitespace-normal" title={column.title}>
						<span class="line-clamp-3">{column.title}</span>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.delegation.id)}
				<tr class="hover:bg-base-200/50">
					<th class="sticky left-0 z-10 bg-base-100 font-normal">
						<div class="flex items-center gap-2">
							{#if row.delegation.assignedNation}
								<Flag size="xs" alpha2Code={row.delegation.assignedNation.alpha2Code} />
							{:else if row.delegation.assignedNonStateActor}
								<Flag
									size="xs"
									nsa={true}
									icon={row.delegation.assignedNonStateActor.fontAwesomeIcon}
								/>
							{/if}
							<span class="truncate max-w-36" title={row.name}>{row.name}</span>
						</div>
					</th>
					{#each columns as column (column.id)}
						{@const papers = row.cells.get(column.id) ?? []}
						<td class="text-center">
							<PaperMatrixCell {papers} {paperHref} />
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
