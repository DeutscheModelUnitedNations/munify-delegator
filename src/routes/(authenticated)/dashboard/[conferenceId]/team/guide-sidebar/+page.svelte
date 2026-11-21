<script lang="ts">
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { getLocale } from '#lib/paraglide/runtime';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { conflictAwareToastMessages, genericPromiseToastMessages } from '#lib/utils/toast';
	import { EMPTY_OUTLINE, parseOutline, type Outline } from '#lib/guide/outline';
	import {
		addSection,
		missingPages,
		moveItem,
		removeSection,
		setTemplateEnabled,
		updateSection
	} from '#lib/guide/outlineEditing';
	import SectionEditor from './SectionEditor.svelte';
	import TemplateEditor from './TemplateEditor.svelte';
	import GuidePreviewPane from './GuidePreviewPane.svelte';
	import OutlineVersions from './OutlineVersions.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);

	// the draft is seeded once and then edited here; saving writes it whole
	const seed = await client.query.guideOutlineOf({ __args: { conferenceId }, draft: true });

	const [stored, library, committees, roles] = $derived(
		await Promise.all([
			client.liveQuery.guideOutlineOf({
				__args: { conferenceId },
				publishedAt: true,
				updatedAt: true,
				versions: { number: true, createdAt: true }
			}),
			client.liveQuery.guideLibrary({
				__args: { conferenceId },
				title: true,
				kind: true,
				publishedVersionId: true
			}),
			client.liveQuery.committees({
				__args: { where: { conferenceId: { eq: conferenceId } }, orderBy: { createdAt: 'asc' } },
				name: true
			}),
			client.liveQuery.conferenceRoles({
				__args: { where: { conferenceId: { eq: conferenceId }, kind: 'CUSTOM' } },
				name: true
			})
		])
	);

	const roleOptions = $derived(roles.map((role) => ({ id: role.id, name: role.name ?? '' })));

	let outline = $state<Outline>(seed ? parseOutline(seed.draft) : EMPTY_OUTLINE);
	let dirty = $state(false);
	let saving = $state(false);

	// general pages to place; committee and agenda item pages come through the template
	const pages = $derived(
		library
			.filter((page) => page.kind === 'GENERAL')
			.map((page) => ({ id: page.id, title: page.title, published: !!page.publishedVersionId }))
			.toSorted((a, b) => a.title.localeCompare(b.title, getLocale()))
	);
	const missing = $derived(missingPages({ outline, available: new Set(pages.map((p) => p.id)) }));
	const unpublished = $derived(
		pages.filter(
			(page) =>
				!page.published &&
				(outline.sections.some((s) => s.entries.some((e) => e.pageId === page.id)) ||
					outline.committeeTemplate?.slots.some((s) => s.type === 'page' && s.pageId === page.id))
		)
	);

	function change(next: Outline) {
		outline = next;
		dirty = true;
	}

	async function save() {
		saving = true;
		try {
			const promise = Promise.resolve(
				client.mutate.updateGuideOutlineDraft({ __args: { conferenceId, outline } })
			);
			toast.promise(promise, conflictAwareToastMessages);
			await promise;
			dirty = false;
		} finally {
			saving = false;
		}
	}

	async function publish() {
		if (!(await confirmDialog({ text: m.guidePublishSidebarConfirm() }))) return;
		if (dirty) await save();
		const promise = Promise.resolve(
			client.mutate.publishGuideOutline({ __args: { conferenceId } })
		);
		toast.promise(promise, conflictAwareToastMessages);
		await promise;
	}

	async function restore(versionId: string) {
		if (!(await confirmDialog({ text: m.guideRestoreConfirm() }))) return;
		const promise = Promise.resolve(
			client.mutate.restoreGuideOutlineVersion({ __args: { conferenceId, versionId } })
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		const fresh = await client.query.guideOutlineOf({ __args: { conferenceId }, draft: true });
		outline = fresh ? parseOutline(fresh.draft) : EMPTY_OUTLINE;
		dirty = false;
	}

	const dateTime = (value: Date | string) =>
		new Date(value).toLocaleString(getLocale(), { dateStyle: 'medium', timeStyle: 'short' });
</script>

<div class="flex w-full flex-col gap-4">
	<header class="flex flex-wrap items-center gap-3">
		<div class="flex flex-col">
			<h1 class="text-2xl font-bold">{m.guideTeamSidebar()}</h1>
			<p class="text-sm opacity-70">
				{stored?.publishedAt
					? m.guideSidebarPublishedAt({ date: dateTime(stored.publishedAt) })
					: m.guideSidebarNeverPublished()}
			</p>
		</div>
		<div class="ml-auto flex flex-wrap gap-2" data-tour="team.guideSidebar.publish">
			<a
				class="btn btn-ghost"
				href={resolve('/(authenticated)/dashboard/[conferenceId]/team/guide', { conferenceId })}
			>
				<i class="ph-duotone ph-book-open-text" aria-hidden="true"></i>
				{m.guideTeamPages()}
			</a>
			<button class="btn btn-primary" onclick={save} disabled={saving || !dirty}>
				<i class="ph-duotone ph-floppy-disk" aria-hidden="true"></i>
				{dirty ? m.guideSaveDraft() : m.guideSaved()}
			</button>
			<button class="btn btn-success" onclick={publish} disabled={saving}>
				<i class="ph-duotone ph-upload-simple" aria-hidden="true"></i>
				{m.guidePublishSidebar()}
			</button>
		</div>
	</header>

	{#if missing.length > 0}
		<div class="alert alert-warning" role="status">
			<i class="ph-duotone ph-warning" aria-hidden="true"></i>
			<span>{m.guideSidebarMissingPages({ count: missing.length })}</span>
		</div>
	{/if}
	{#if unpublished.length > 0}
		<div class="alert alert-info alert-soft" role="status">
			<i class="ph-duotone ph-info" aria-hidden="true"></i>
			<span
				>{m.guideSidebarUnpublishedPages({
					pages: unpublished.map((page) => page.title).join(', ')
				})}</span
			>
		</div>
	{/if}

	<div class="grid gap-4 xl:grid-cols-2">
		<div class="flex flex-col gap-3" data-tour="team.guideSidebar.sections">
			{#if outline.sections.length === 0}
				<div class="alert" role="status">{m.guideSidebarEmpty()}</div>
			{/if}
			{#each outline.sections as section, index (section.id)}
				{#if outline.committeeTemplate?.position === index}
					<div class="divider text-xs">{m.guideCommitteeSectionsHere()}</div>
				{/if}
				<SectionEditor
					{section}
					{pages}
					roles={roleOptions}
					onChange={(changed) => change(updateSection({ outline, index, change: () => changed }))}
					onMove={(by) =>
						change({ ...outline, sections: moveItem({ list: outline.sections, index, by }) })}
					onRemove={() => change(removeSection({ outline, index }))}
				/>
			{/each}
			{#if outline.committeeTemplate && outline.committeeTemplate.position >= outline.sections.length}
				<div class="divider text-xs">{m.guideCommitteeSectionsHere()}</div>
			{/if}
			<button
				class="btn btn-ghost self-start"
				onclick={() => change(addSection({ outline, title: m.guideNewSection() }))}
			>
				<i class="ph-duotone ph-plus" aria-hidden="true"></i>
				{m.guideAddSection()}
			</button>
			<TemplateEditor
				template={outline.committeeTemplate}
				sectionTitles={outline.sections.map((section) => section.title)}
				{pages}
				onEnable={(enabled) => change(setTemplateEnabled({ outline, enabled }))}
				onChange={(committeeTemplate) => change({ ...outline, committeeTemplate })}
			/>
			<OutlineVersions versions={stored?.versions ?? []} onRestore={restore} />
		</div>
		<GuidePreviewPane
			{conferenceId}
			committees={committees.map((committee) => ({ id: committee.id, name: committee.name }))}
			roles={roleOptions}
		/>
	</div>
	{#if dirty}<p class="text-sm opacity-70">{m.guidePreviewShowsSaved()}</p>{/if}
</div>
