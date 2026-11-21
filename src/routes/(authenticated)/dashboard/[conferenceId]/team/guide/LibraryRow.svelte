<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { SCOPE_BADGE, scopeLabel } from '#lib/components/guide/guideLabels';
	import type { GuidePageState, LibraryRow } from '#lib/guide/library';

	/** A page in the team's list: kind, title, scope, state and the sidebars that name it. */
	interface Props {
		row: LibraryRow & { usedIn: readonly string[] };
		href: string;
		series: string | null;
		year: number;
	}

	let { row, href, series, year }: Props = $props();

	const KIND_ICON: Record<LibraryRow['kind'], string> = {
		GENERAL: 'ph-file-text',
		COMMITTEE: 'ph-users-three',
		AGENDA_ITEM: 'ph-chat-centered-text'
	};
	const STATE_LOOK: Record<GuidePageState, { label: () => string; badge: string }> = {
		DRAFT: { label: () => m.guideStateDraft(), badge: 'badge-ghost' },
		PUBLISHED: { label: () => m.guideStatePublished(), badge: 'badge-success' },
		CHANGED: { label: () => m.guideStateChanged(), badge: 'badge-warning' }
	};
</script>

<li>
	<a
		{href}
		class="rounded-box border-base-300 hover:bg-base-200 flex flex-wrap items-center gap-2 border p-3"
	>
		<i class="ph-duotone {KIND_ICON[row.kind]} text-xl" aria-hidden="true"></i>
		<span class="min-w-0 flex-1 font-medium">{row.title}</span>
		<span class="badge {SCOPE_BADGE[row.scope]} badge-sm">
			{scopeLabel({ kind: row.scope, series, year })}
		</span>
		<span class="badge {STATE_LOOK[row.state].badge} badge-sm">{STATE_LOOK[row.state].label()}</span
		>
		{#if row.usedIn.length > 0}
			<span class="text-xs opacity-60" title={row.usedIn.join(', ')}>
				<i class="ph-duotone ph-list-bullets" aria-hidden="true"></i>
				{m.guideUsedInSidebars({ count: row.usedIn.length })}
			</span>
		{/if}
	</a>
</li>
