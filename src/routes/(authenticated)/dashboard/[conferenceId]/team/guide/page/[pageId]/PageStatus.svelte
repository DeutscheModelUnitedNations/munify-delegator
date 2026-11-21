<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { SCOPE_BADGE, scopeLabel } from '#lib/components/guide/guideLabels';
	import type { GuideScopeKind } from '#lib/guide/scope';

	/** Where the page reaches now and once published, and where it is used. */
	interface Props {
		page: {
			scope: GuideScopeKind;
			publishedScope?: GuideScopeKind | null;
			publishedVersionId?: string | null;
			usedInSidebars: readonly string[];
			draftUpdatedAt: Date | string;
		};
		savedAt: Date;
		series: string | null;
		year: number;
	}

	let { page, savedAt, series, year }: Props = $props();

	const label = (kind: GuideScopeKind) => scopeLabel({ kind, series, year });
	const scopeMoves = $derived(!!page.publishedScope && page.publishedScope !== page.scope);
	const changedElsewhere = $derived(new Date(page.draftUpdatedAt).getTime() > savedAt.getTime());
</script>

<div class="flex flex-wrap items-center gap-2 text-sm">
	<span class="badge {SCOPE_BADGE[page.scope]}">{label(page.scope)}</span>
	{#if scopeMoves && page.publishedScope}
		<span class="badge badge-warning badge-outline">
			{m.guidePublishedScopeIs({ scope: label(page.publishedScope) })}
		</span>
	{/if}
	{#if !page.publishedVersionId}<span class="badge badge-ghost">{m.guideStateDraft()}</span>{/if}
	{#if page.usedInSidebars.length > 0}
		<span class="opacity-70">{m.guideUsedIn({ conferences: page.usedInSidebars.join(', ') })}</span>
	{/if}
	{#if changedElsewhere}<span class="text-warning">{m.guideChangedElsewhere()}</span>{/if}
</div>
