<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { canEditConference } from '#lib/helpers/teamAccess';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import FilterChips from '#lib/components/FilterChips.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import ScopePicker from '#lib/components/guide/ScopePicker.svelte';
	import { scopeLabel } from '#lib/components/guide/guideLabels';
	import { scopeContextOf, type GuideScopeKind } from '#lib/guide/scope';
	import { fetchGuideConference } from '#lib/components/guide/guideConference';
	import {
		filterLibrary,
		guidePageState,
		stateCounts,
		type GuidePageState,
		type LibraryRow as Row
	} from '#lib/guide/library';
	import GuideSettings from './GuideSettings.svelte';
	import CommitteePages from './CommitteePages.svelte';
	import LibraryRow from './LibraryRow.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);

	const [conference, pages, access] = $derived(
		await Promise.all([
			fetchGuideConference(conferenceId),
			client.liveQuery.guideLibrary({
				__args: { conferenceId },
				title: true,
				kind: true,
				scope: true,
				draftUpdatedAt: true,
				usedInSidebars: true,
				publishedVersion: { createdAt: true }
			}),
			fetchTeamAccess(conferenceId)
		])
	);

	const { year, seriesName } = $derived(scopeContextOf(conference));

	const rows = $derived<(Row & { usedIn: readonly string[] })[]>(
		pages.map((page) => ({
			id: page.id,
			title: page.title,
			kind: page.kind,
			scope: page.scope,
			usedIn: page.usedInSidebars,
			state: guidePageState({
				publishedAt: page.publishedVersion?.createdAt,
				draftUpdatedAt: page.draftUpdatedAt
			})
		}))
	);

	let scopeFilter = $state<GuideScopeKind | null>(null);
	let stateFilter = $state<GuidePageState | null>(null);
	const shown = $derived(
		filterLibrary({ rows, filter: { scope: scopeFilter, state: stateFilter }, locale: getLocale() })
	);
	const counts = $derived(stateCounts(rows));

	const STATE_LABEL: Record<GuidePageState, () => string> = {
		DRAFT: () => m.guideStateDraft(),
		PUBLISHED: () => m.guideStatePublished(),
		CHANGED: () => m.guideStateChanged()
	};
	const SCOPES: GuideScopeKind[] = ['EVERYWHERE', 'YEAR', 'SERIES', 'CONFERENCE'];
	const STATES: GuidePageState[] = ['DRAFT', 'CHANGED', 'PUBLISHED'];

	const editorHref = (pageId: string) =>
		resolve('/(authenticated)/dashboard/[conferenceId]/team/guide/page/[pageId]', {
			conferenceId,
			pageId
		});

	let creating = $state(false);
	let newTitle = $state('');
	let newScope = $state<GuideScopeKind>('CONFERENCE');

	async function create() {
		const title = newTitle.trim();
		if (!title) return;
		const promise = client.mutate.createGuidePage({
			__args: { conferenceId, title, scope: newScope },
			title: true
		});
		toast.promise(promise, {
			loading: m.genericToastLoading(),
			success: m.guidePageCreated(),
			error: (error) => (error instanceof Error ? error.message : m.genericToastError())
		});
		const page = await promise;
		creating = false;
		newTitle = '';
		await goto(editorHref(page.id));
	}
</script>

<div class="flex w-full flex-col gap-6">
	<header class="flex flex-wrap items-center gap-3">
		<div class="flex flex-col">
			<h1 class="text-2xl font-bold">{m.guideTeamPages()}</h1>
			<p class="text-sm opacity-70">{m.guideTeamPagesDescription()}</p>
		</div>
		<div class="ml-auto flex flex-wrap gap-2">
			<a
				class="btn btn-ghost"
				href={resolve('/(authenticated)/dashboard/[conferenceId]/team/guide-sidebar', {
					conferenceId
				})}
			>
				<i class="ph-duotone ph-list-bullets" aria-hidden="true"></i>
				{m.guideTeamSidebar()}
			</a>
			<button class="btn btn-primary" data-tour="team.guide.new" onclick={() => (creating = true)}>
				<i class="ph-duotone ph-plus" aria-hidden="true"></i>
				{m.guideNewPage()}
			</button>
		</div>
	</header>

	<GuideSettings {conferenceId} canChangeSeries={canEditConference(access)} />

	<div class="flex flex-col gap-2">
		<FilterChips
			options={SCOPES.map((key) => ({ key }))}
			selected={scopeFilter}
			onSelect={(key) => (scopeFilter = SCOPES.find((scope) => scope === key) ?? null)}
			label={m.guideFilterByScope()}
		>
			{#snippet chip(option)}{scopeLabel({ kind: option.key, series: seriesName, year })}{/snippet}
		</FilterChips>
		<FilterChips
			options={STATES.map((key) => ({ key }))}
			selected={stateFilter}
			onSelect={(key) => (stateFilter = STATES.find((state) => state === key) ?? null)}
			label={m.guideFilterByState()}
		>
			{#snippet chip(option)}{STATE_LABEL[option.key]()} ({counts[option.key]}){/snippet}
		</FilterChips>
	</div>

	<section data-tour="team.guide.list" aria-label={m.guideTeamPages()}>
		{#if shown.length === 0}
			<div class="alert" role="status">
				<i class="ph-duotone ph-book-open" aria-hidden="true"></i>
				<span>{rows.length === 0 ? m.guideNoPages() : m.guideNoPagesFiltered()}</span>
			</div>
		{:else}
			<ul class="flex flex-col gap-2" data-testid="guide-library">
				{#each shown as row (row.id)}
					<LibraryRow {row} href={editorHref(row.id)} series={seriesName} {year} />
				{/each}
			</ul>
		{/if}
	</section>

	<CommitteePages {conferenceId} {editorHref} />
</div>

<Modal bind:open={creating} title={m.guideNewPage()}>
	<form
		class="flex flex-col gap-4"
		id="new-guide-page"
		onsubmit={(event) => {
			event.preventDefault();
			void create();
		}}
	>
		<label class="fieldset">
			<span class="fieldset-legend">{m.guidePageTitle()}</span>
			<input class="input w-full" bind:value={newTitle} required maxlength="200" />
		</label>
		<ScopePicker bind:value={newScope} series={seriesName} {year} />
	</form>
	{#snippet action()}
		<button class="btn" type="button" onclick={() => (creating = false)}>{m.cancel()}</button>
		<button class="btn btn-primary" type="submit" form="new-guide-page" disabled={!newTitle.trim()}>
			{m.guideNewPage()}
		</button>
	{/snippet}
</Modal>
