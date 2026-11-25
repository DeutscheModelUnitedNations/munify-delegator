<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import type { GuidePreviewAudience } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import GuideSidebarNav from './GuideSidebarNav.svelte';
	import GuidePageArticle from './GuidePageArticle.svelte';
	import GuideToc from './GuideToc.svelte';

	/**
	 * A reader's guide: the sidebar of their sections, the open page with its table of contents and
	 * the way to the previous and next page (`docs/plans/guide.md`, "Participant view"). The team
	 * uses it as preview, as another reader (`previewAs`) or of the drafts.
	 */
	interface Props {
		conferenceId: string;
		/** The open page; the guide's first one without. */
		pageId?: string;
		/** Which place of a page shared by several sections is open. */
		entryKey?: string | null;
		/** Where an entry of the guide is opened. */
		hrefOf: (entry: { pageId: string; key?: string }) => string;
		preview?: {
			previewAs?: GuidePreviewAudience;
			committeeId?: string;
			roleId?: string;
			draft?: boolean;
		};
	}

	let { conferenceId, pageId, entryKey = null, hrefOf, preview = {} }: Props = $props();

	const previewAs = $derived(preview.previewAs);
	const committeeId = $derived(preview.committeeId);
	const roleId = $derived(preview.roleId);
	const draft = $derived(preview.draft);

	const guide = $derived(
		await client.liveQuery.myGuide({
			__args: { conferenceId, previewAs, committeeId, roleId, draft },
			preview: true,
			sections: {
				key: true,
				title: true,
				entries: { key: true, pageId: true, title: true, indent: true }
			}
		})
	);

	const sections = $derived(guide?.sections ?? []);
	const first = $derived(sections[0]?.entries[0]);
	const openPageId = $derived(pageId ?? first?.pageId);
	const openKey = $derived(pageId ? entryKey : (first?.key ?? null));

	const page = $derived(
		openPageId
			? await client.liveQuery.guideReaderPage({
					__args: {
						conferenceId,
						pageId: openPageId,
						entryKey: openKey,
						previewAs,
						committeeId,
						roleId,
						draft
					},
					pageId: true,
					entryKey: true,
					title: true,
					sectionTitle: true,
					content: true,
					pdfUrl: true,
					updatedAt: true,
					headings: { anchor: true, level: true, text: true },
					previous: { key: true, pageId: true, title: true },
					next: { key: true, pageId: true, title: true }
				})
			: null
	);

	let menuOpen = $state(false);
</script>

{#snippet navigation()}
	<GuideSidebarNav
		{sections}
		activeKey={page?.entryKey}
		{hrefOf}
		onNavigate={() => (menuOpen = false)}
	/>
{/snippet}

{#if !guide || sections.length === 0}
	<div class="alert {guide ? '' : 'alert-info'}" role="status">
		<i class="ph-duotone ph-book-open text-2xl" aria-hidden="true"></i>
		<span>{guide ? m.guideEmpty() : m.guideNotYetAvailable()}</span>
	</div>
{:else}
	<div
		class="grid w-full gap-6 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_14rem]"
	>
		<details class="collapse-arrow bg-base-200 rounded-box collapse lg:hidden" bind:open={menuOpen}>
			<summary class="collapse-title font-semibold">
				<i class="ph-duotone ph-list" aria-hidden="true"></i>
				{m.guideContents()}
			</summary>
			<div class="collapse-content">{@render navigation()}</div>
		</details>
		<aside class="hidden lg:block">
			<div class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
				{@render navigation()}
			</div>
		</aside>

		<article class="min-w-0" data-testid="guide-page">
			{#if page}
				<GuidePageArticle {page} {hrefOf} />
			{:else}
				<div class="alert alert-warning" role="status">
					<i class="ph-duotone ph-warning" aria-hidden="true"></i>
					<span>{m.guidePageNotInGuide()}</span>
				</div>
			{/if}
		</article>

		{#if page && page.headings.length > 1}<GuideToc headings={page.headings} />{/if}
	</div>
{/if}
