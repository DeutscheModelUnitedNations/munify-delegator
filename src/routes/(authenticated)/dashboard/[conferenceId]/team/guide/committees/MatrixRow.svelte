<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '#lib/paraglide/messages';
	import type { MatrixCell, MatrixRow } from '#lib/guide/workspace';
	import MatrixPage from './MatrixPage.svelte';
	import { matrixRowHeading } from './matrixRowHeading';

	/**
	 * A row of the committee matrix: a shared page across all committees, or a committee's own
	 * page per column (missing ones created from here).
	 */
	interface Props {
		row: MatrixRow;
		columns: number;
		hrefOf: (pageId: string) => ResolvedPathname;
		onCreate: (cell: Extract<MatrixCell, { kind: 'missing' }>) => void;
	}

	let { row, columns, hrefOf, onCreate }: Props = $props();

	const heading = $derived(
		matrixRowHeading({
			row,
			texts: {
				missing: m.guidePageMissing(),
				committeePage: m.guideSlotCommitteePage(),
				agendaItem: (number) => m.guideAgendaItemNumber({ number })
			}
		})
	);
</script>

<tr>
	<th
		scope="row"
		class={[row.kind === 'agendaItem' && 'ps-6', row.kind === 'shared' && 'font-normal']}
	>
		{heading}
		{#if row.kind === 'shared'}<div class="text-xs opacity-70">
				{m.guideCommitteesShared()}
			</div>{/if}
	</th>
	{#if row.kind === 'shared'}
		<td colspan={columns} class="bg-base-200">
			{#if row.page}
				<MatrixPage href={hrefOf(row.page.id)} title={row.page.title} state={row.page.state} />
			{:else}
				<span class="text-error">{m.guidePageMissing()}</span>
			{/if}
		</td>
	{:else}
		{#each row.cells as cell, index (index)}
			<td>
				{#if cell.kind === 'page'}
					<MatrixPage href={hrefOf(cell.pageId)} title={cell.title} state={cell.state} />
				{:else if cell.kind === 'missing'}
					<button
						class="btn btn-xs btn-outline btn-error"
						onclick={() => onCreate(cell)}
						aria-label={m.guideCreatePageFor({ title: cell.title })}
						title={cell.title}
					>
						<i class="ph-duotone ph-plus" aria-hidden="true"></i>
						{m.guideCreateOwnedPage()}
					</button>
				{:else}
					<span class="opacity-40" title={m.guideCommitteesNoAgendaItem()}>–</span>
				{/if}
			</td>
		{/each}
	{/if}
</tr>
