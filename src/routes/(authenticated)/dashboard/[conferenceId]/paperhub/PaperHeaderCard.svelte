<script lang="ts">
	import { getLocale } from '#lib/paraglide/runtime';
	import type { Snippet } from 'svelte';
	import type { PaperstatusEnum } from '#lib/api/rumbleClient/client';
	import Flag from '#lib/components/Flag.svelte';
	import { splitRole } from '#lib/helpers/conferenceRole';
	import { m } from '#lib/paraglide/messages';
	import { getPaperStatusIcon, getPaperTypeIcon } from '#lib/utils/enumIcons';
	import { translatePaperStatus, translatePaperType } from '#lib/utils/enumTranslations';
	import { getStatusBadgeClass } from '#lib/utils/paperStatusHelpers';
	import { paperEntityName, paperTitle, type PaperIdentity } from './paperDisplay';

	interface Props {
		paper: PaperIdentity & { firstSubmittedAt: Date | null };
		/** Shown as a badge next to the delegation when given. */
		status?: PaperstatusEnum;
		/** Shown in the metadata row, together with `createdAt`, when given. */
		versionNumber?: number;
		createdAt?: Date;
		/** Buttons on the right of the metadata row. */
		actions?: Snippet;
		/** A row below the metadata, separated by a divider. */
		footer?: Snippet;
	}

	let { paper, status, versionNumber, createdAt, actions, footer }: Props = $props();

	let { nation, nonStateActor: nsa } = $derived(splitRole(paper.delegation.assignedRole));
</script>

<div class="card bg-base-200 border border-base-300">
	<div class="card-body p-4">
		<!-- Top Row: Country/NSA + Status -->
		<div class="flex items-center justify-between gap-4 flex-wrap">
			<div class="flex min-w-0 items-center gap-3">
				<Flag size="md" alpha2Code={nation?.alpha2Code} nsa={!!nsa} icon={nsa?.fontAwesomeIcon} />
				<span class="text-lg font-semibold min-w-0 break-words"
					>{paperEntityName(paper.delegation)}</span
				>
			</div>
			{#if status}
				<div class="badge {getStatusBadgeClass(status)} badge-lg max-sm:badge-md gap-2">
					<i class="fa-sharp-duotone fa-solid {getPaperStatusIcon(status)}"></i>
					{translatePaperStatus(status)}
				</div>
			{/if}
		</div>

		<!-- Title -->
		<h1 class="text-2xl font-bold mt-2 break-words">{paperTitle(paper)}</h1>

		<!-- Metadata Row -->
		<div class="flex items-center justify-between gap-3 mt-2 flex-wrap">
			<div class="flex items-center gap-3 text-sm text-base-content/70 flex-wrap">
				<span class="flex items-center gap-1">
					<i class="fa-sharp-duotone fa-solid {getPaperTypeIcon(paper.type)}"></i>
					{translatePaperType(paper.type)}
				</span>
				{#if versionNumber !== undefined}
					<span class="text-base-content/30">•</span>
					<div class="tooltip" data-tip={m.version()}>
						<span class="font-mono">v{versionNumber}</span>
					</div>
				{/if}
				{#if createdAt}
					<span class="text-base-content/30">•</span>
					<div class="tooltip" data-tip={m.createdAt()}>
						<span class="flex items-center gap-1">
							<i class="fa-sharp-duotone fa-solid fa-plus text-xs"></i>
							{createdAt.toLocaleDateString(getLocale())}
						</span>
					</div>
				{/if}
				{#if paper.firstSubmittedAt}
					<span class="text-base-content/30">•</span>
					<div class="tooltip" data-tip={m.submittedAt()}>
						<span class="flex items-center gap-1">
							<i class="fa-sharp-duotone fa-solid fa-paper-plane text-xs"></i>
							{paper.firstSubmittedAt.toLocaleDateString(getLocale())}
						</span>
					</div>
				{/if}
			</div>
			{#if actions}
				<div class="flex flex-wrap items-center gap-2">
					{@render actions()}
				</div>
			{/if}
		</div>
		{#if footer}
			<div class="border-t border-base-300 mt-2 pt-3">
				{@render footer()}
			</div>
		{/if}
	</div>
</div>
