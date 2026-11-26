<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import {
		committeeMatrix,
		committeeProgress,
		rowIsOpen,
		type MatrixCell
	} from '#lib/guide/workspace';
	import MatrixHead from './MatrixHead.svelte';
	import MatrixRow from './MatrixRow.svelte';
	import { getOutlineDraft } from '../outlineDraft.svelte';
	import {
		fetchWorkspaceCommittees,
		fetchWorkspaceLibrary,
		toMatrixCommittees,
		pageCreatedToast,
		toWorkspacePages
	} from '../workspaceData';
	import type { PageProps } from './$types';

	/**
	 * The committee template per committee: a row per step, a column per committee. Shared pages
	 * span all columns; a committee's own page or agenda item page that is missing is created here.
	 */
	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);
	const draft = getOutlineDraft();

	const [library, committeeRows] = $derived(
		await Promise.all([fetchWorkspaceLibrary(conferenceId), fetchWorkspaceCommittees(conferenceId)])
	);

	const pages = $derived(toWorkspacePages(library));
	const committees = $derived(toMatrixCommittees(committeeRows));
	const slots = $derived(draft.outline.committeeTemplate?.slots);
	const rows = $derived(committeeMatrix({ slots, committees, pages }));
	const progress = $derived(committeeProgress(rows, committees.length));
	const open = $derived(rows.filter(rowIsOpen).length);
	let onlyOpen = $state(false);
	const shown = $derived(onlyOpen ? rows.filter(rowIsOpen) : rows);

	const hrefOf = (pageId: string) =>
		resolve('/(authenticated)/dashboard/[conferenceId]/team/guide/page/[pageId]', {
			conferenceId,
			pageId
		});

	async function create(cell: Extract<MatrixCell, { kind: 'missing' }>) {
		const promise = client.mutate.ensureGuidePageOf({ __args: cell.owner, title: true });
		toast.promise(promise, pageCreatedToast);
		const page = await promise;
		await goto(hrefOf(page.id));
	}
</script>

<div class="flex w-full flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<p class="text-sm opacity-70">
			{slots ? m.guideCommitteesHint() : m.guideCommitteesNoTemplate()}
		</p>
		<label class="label ml-auto cursor-pointer gap-2 text-sm">
			<input type="checkbox" class="toggle toggle-sm" bind:checked={onlyOpen} />
			{m.guideCommitteesOnlyOpen({ count: open })}
		</label>
	</div>

	{#if committees.length === 0}
		<div class="alert" role="status">{m.guideNoCommittees()}</div>
	{:else}
		<div class="overflow-x-auto" data-tour="team.guideCommittees.matrix">
			<table class="table-sm table min-w-max" data-testid="guide-committee-matrix">
				<caption class="sr-only">{m.guideTabCommittees()}</caption>
				<MatrixHead {committees} {progress} />
				<tbody>
					{#each shown as row (row.key)}
						<MatrixRow {row} columns={committees.length} {hrefOf} onCreate={create} />
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
