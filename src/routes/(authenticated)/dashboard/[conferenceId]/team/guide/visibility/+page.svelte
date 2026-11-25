<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { expandOutline, guideForReader } from '#lib/guide/outline';
	import {
		readerOf,
		templateCommittees,
		visibilityRows,
		type ReaderGroup
	} from '#lib/guide/workspace';
	import { getOutlineDraft } from '../outlineDraft.svelte';
	import { fetchWorkspace, toWorkspace } from '../workspaceData';
	import ReaderSidebar from './ReaderSidebar.svelte';
	import VisibilityTable from './VisibilityTable.svelte';
	import type { PageProps } from './$types';

	/**
	 * Who sees what: pick a group of readers and see their sidebar as the draft builds it; the
	 * table lists every section (and entry with its own audience) against every group.
	 */
	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);
	const draft = getOutlineDraft();

	const workspace = $derived(await fetchWorkspace(conferenceId));

	const { pages, committees, roles } = $derived(toWorkspace(workspace));
	const outline = $derived(draft.outline);

	const groups = $derived<{ group: ReaderGroup; label: string }[]>([
		{ group: { type: 'delegates' }, label: m.guideAudienceDelegates() },
		{ group: { type: 'nonStateActors' }, label: m.guideAudienceNonStateActors() },
		...roles.map((role) => ({
			group: { type: 'customRole' as const, roleId: role.id },
			label: role.name
		})),
		{ group: { type: 'supervisors' }, label: m.guideAudienceSupervisors() }
	]);

	let picked = $state(0);
	let committeeId = $state<string | null>(null);
	const committee = $derived(committeeId ?? committees[0]?.id ?? null);
	const current = $derived(groups[Math.min(picked, groups.length - 1)]);

	const sections = $derived(
		guideForReader({
			sections: expandOutline({ outline, committees: templateCommittees({ committees, pages }) }),
			reader: readerOf({ group: current.group, committeeId: committee })
		})
	);
	const byId = $derived(new Map(pages.map((page) => [page.id, page])));
	const rows = $derived(
		visibilityRows({
			outline,
			groups: groups.map((entry) => entry.group),
			titles: {
				template: m.guideCommitteeTemplate(),
				page: (pageId) => byId.get(pageId)?.title ?? m.guidePageMissing()
			}
		})
	);

	const hrefOf = (pageId: string) =>
		resolve('/(authenticated)/dashboard/[conferenceId]/team/guide/page/[pageId]', {
			conferenceId,
			pageId
		});
</script>

<div class="flex w-full flex-col gap-4">
	<div
		class="flex flex-wrap items-center gap-2"
		role="group"
		aria-label={m.guidePreviewAs()}
		data-tour="team.guideVisibility.readers"
	>
		<span class="text-xs font-bold tracking-wider uppercase opacity-80">{m.guidePreviewAs()}</span>
		{#each groups as entry, index (index)}
			<button
				class={['btn btn-sm', index === picked ? 'btn-neutral' : 'btn-outline']}
				aria-pressed={index === picked}
				onclick={() => (picked = index)}
			>
				{entry.label}
			</button>
		{/each}
		{#if current.group.type === 'delegates' && committees.length > 0}
			<select
				class="select select-sm w-auto"
				aria-label={m.guideCommittee()}
				value={committee}
				onchange={(event) => (committeeId = event.currentTarget.value)}
			>
				{#each committees as option (option.id)}
					<option value={option.id}>{option.name}</option>
				{/each}
			</select>
		{/if}
	</div>

	<div class="flex flex-col gap-6 lg:flex-row lg:items-start">
		<ReaderSidebar {sections} {pages} {hrefOf} label={current.label} />
		<VisibilityTable
			{rows}
			{outline}
			{roles}
			groups={groups.map((entry) => entry.label)}
			{picked}
			onPick={(index) => (picked = index)}
		/>
	</div>
</div>
