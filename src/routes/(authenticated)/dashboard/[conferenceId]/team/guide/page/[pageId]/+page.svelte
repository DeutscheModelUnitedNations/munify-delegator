<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { confirmDialog } from '#lib/state/dialogs.svelte.js';
	import { conflictAwareToastMessages, genericPromiseToastMessages } from '#lib/utils/toast';
	import GuideEditor from '#lib/components/guide/editor/GuideEditor.svelte';
	import GuideContent from '#lib/components/guide/GuideContent.svelte';
	import {
		COMMITTEE_PLACEHOLDERS,
		fileIdOf,
		mapNodes,
		parseGuideDocument,
		placeholdersIn,
		referencedFileIds,
		type GuideDocument
	} from '#lib/guide/document';
	import { scopeContextOf, type GuideScopeKind } from '#lib/guide/scope';
	import { fetchGuideConference } from '#lib/components/guide/guideConference';
	import PublishDialog from './PublishDialog.svelte';
	import VersionList from './VersionList.svelte';
	import ScopeSection from './ScopeSection.svelte';
	import PageStatus from './PageStatus.svelte';
	import GuideEntries from './GuideEntries.svelte';
	import { withoutPage } from '#lib/guide/outlineEditing';
	import { getOutlineDraft } from '../../outlineDraft.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = untrack(() => params.conferenceId);
	const pageId = untrack(() => params.pageId);
	const draft = getOutlineDraft();

	// the text is seeded once: re-reading it while typing would discard the edits
	const seed = await client.query.guidePage({
		__args: { id: pageId },
		title: true,
		content: true,
		draftUpdatedAt: true
	});

	const [page, conference] = $derived(
		await Promise.all([
			client.liveQuery.guidePage({
				__args: { id: pageId },
				kind: true,
				scope: true,
				publishedScope: true,
				draftUpdatedAt: true,
				usedInSidebars: true,
				publishedVersionId: true,
				versions: { number: true, title: true, createdAt: true, scope: true, pdfUrl: true }
			}),
			fetchGuideConference(conferenceId)
		])
	);

	const { year, seriesName } = $derived(scopeContextOf(conference));

	let title = $state(seed.title);
	let doc = $state<GuideDocument>(parseGuideDocument(seed.content));
	let savedAt = $state<Date>(new Date(seed.draftUpdatedAt));
	let dirty = $state(false);
	let saving = $state(false);
	let showPreview = $state(false);
	let publishing = $state(false);

	// the files the text names, to show them while editing and in the preview
	let uploaded = $state<string[]>([]);
	const fileIds = $derived([...new Set([...referencedFileIds(doc), ...uploaded])].toSorted());
	const fileUrls = $derived(
		fileIds.length > 0
			? await client.query.guideFileUrls({
					__args: { conferenceId, fileIds },
					fileId: true,
					url: true
				})
			: []
	);
	const urlOf = $derived(
		new Map<string, string>(fileUrls.map((file): [string, string] => [file.fileId, file.url]))
	);
	const fileUrl = (src: string) => {
		const id = fileIdOf(src);
		return id ? urlOf.get(id) : src;
	};

	/** The text as the preview shows it: files as their URLs. */
	const previewDoc = $derived(
		mapNodes(doc, (node) => {
			if (node.type === 'image' && typeof node.attrs?.src === 'string') {
				return { ...node, attrs: { ...node.attrs, src: fileUrl(node.attrs.src) } };
			}
			return node;
		})
	);

	const committeePlaceholders = $derived(
		placeholdersIn(doc).filter((name) => COMMITTEE_PLACEHOLDERS.includes(name))
	);

	async function save() {
		if (saving) return;
		saving = true;
		try {
			const promise = client.mutate.updateGuidePageDraft({
				__args: { id: pageId, title: title.trim(), content: doc, expectedDraftUpdatedAt: savedAt },
				draftUpdatedAt: true
			});
			toast.promise(promise, conflictAwareToastMessages);
			const saved = await promise;
			savedAt = new Date(saved.draftUpdatedAt);
			dirty = false;
		} finally {
			saving = false;
		}
	}

	async function setScope(scope: GuideScopeKind) {
		const promise = client.mutate.setGuidePageScope({
			__args: { id: pageId, conferenceId, scope },
			draftUpdatedAt: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		savedAt = new Date((await promise).draftUpdatedAt);
	}

	async function publish() {
		if (dirty) await save();
		const promise = client.mutate.publishGuidePage({
			__args: { id: pageId },
			draftUpdatedAt: true
		});
		toast.promise(promise, {
			loading: m.guidePublishing(),
			success: m.guidePublished(),
			error: (error) => (error instanceof Error ? error.message : m.genericToastError())
		});
		await promise;
	}

	async function restore(versionId: string) {
		if (!(await confirmDialog({ text: m.guideRestoreConfirm() }))) return;
		const promise = client.mutate.restoreGuidePageVersion({
			__args: { id: pageId, versionId },
			title: true,
			content: true,
			draftUpdatedAt: true
		});
		toast.promise(promise, genericPromiseToastMessages);
		const restored = await promise;
		title = restored.title;
		doc = parseGuideDocument(restored.content);
		savedAt = new Date(restored.draftUpdatedAt);
		dirty = false;
		editorKey += 1;
	}

	async function remove() {
		if (!(await confirmDialog({ text: m.guideDeleteConfirm(), danger: true }))) return;
		// the draft must not name a page that is gone
		draft.change(withoutPage({ outline: draft.outline, pageId }));
		if (!(await draft.flush())) return;
		const promise = Promise.resolve(client.mutate.deleteGuidePage({ __args: { id: pageId } }));
		toast.promise(promise, conflictAwareToastMessages);
		await promise;
		await goto(resolve('/(authenticated)/dashboard/[conferenceId]/team/guide', { conferenceId }));
	}

	// a restored version replaces the editor's content
	let editorKey = $state(0);

	function onKeydown(event: KeyboardEvent) {
		if ((event.ctrlKey || event.metaKey) && event.key === 's') {
			event.preventDefault();
			void save();
		}
	}
</script>

<svelte:window onkeydown={onKeydown} />

<div class="flex w-full flex-col gap-4 xl:flex-row xl:items-start">
	<div class="flex min-w-0 flex-1 flex-col gap-4">
		<header class="flex flex-col gap-3">
			<label class="fieldset w-full">
				<span class="fieldset-legend">{m.guidePageTitle()}</span>
				<input
					class="input input-lg w-full"
					bind:value={title}
					maxlength="200"
					oninput={() => (dirty = true)}
				/>
			</label>
			<div class="flex flex-wrap gap-2" data-tour="team.guidePage.publish">
				<button class="btn" onclick={() => (showPreview = !showPreview)} aria-pressed={showPreview}>
					<i class="ph-duotone ph-eye" aria-hidden="true"></i>
					{m.guidePreview()}
				</button>
				<button class="btn btn-primary" onclick={save} disabled={saving || !dirty || !title.trim()}>
					<i class="ph-duotone ph-floppy-disk" aria-hidden="true"></i>
					{dirty ? m.guideSaveDraft() : m.guideSaved()}
				</button>
				<button class="btn btn-success" onclick={() => (publishing = true)} disabled={saving}>
					<i class="ph-duotone ph-upload-simple" aria-hidden="true"></i>
					{m.guidePublishPage()}
				</button>
			</div>
		</header>

		<PageStatus {page} {savedAt} series={seriesName} {year} />

		{#if committeePlaceholders.length > 0 && page.kind === 'GENERAL'}
			<div class="alert alert-info alert-soft text-sm">
				<i class="ph-duotone ph-info" aria-hidden="true"></i>
				<span>{m.guideCommitteePlaceholderHint()}</span>
			</div>
		{/if}

		<div data-tour="team.guidePage.editor">
			{#key editorKey}
				<GuideEditor
					content={doc}
					{conferenceId}
					{fileUrl}
					onChange={(changed) => {
						doc = changed;
						dirty = true;
					}}
					onUpload={(id) => (uploaded = [...uploaded, id])}
				/>
			{/key}
		</div>
		{#if showPreview}
			<section class="rounded-box border-base-300 border p-4" aria-label={m.guidePreview()}>
				<h2 class="mb-4 text-2xl font-bold">{title}</h2>
				<GuideContent content={previewDoc} pageHref={() => '#'} />
			</section>
		{/if}
	</div>

	<aside
		class="border-base-300 flex flex-col gap-6 xl:w-80 xl:shrink-0 xl:border-l xl:ps-4"
		aria-label={m.guidePageSettings()}
	>
		<ScopeSection
			kind={page.kind}
			scope={page.scope}
			series={seriesName}
			{year}
			onApply={setScope}
		/>
		<GuideEntries {conferenceId} {pageId} kind={page.kind} />
		<VersionList versions={page.versions} onRestore={restore} />
		{#if page.kind === 'GENERAL'}
			<div>
				<button class="btn btn-error btn-outline btn-sm" onclick={remove}>
					<i class="ph-duotone ph-trash" aria-hidden="true"></i>
					{m.guideDeletePage()}
				</button>
			</div>
		{/if}
	</aside>
</div>

<PublishDialog {pageId} bind:open={publishing} onPublish={publish} />
