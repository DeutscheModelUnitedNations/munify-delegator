<!--
	@component
	The conference in the linked MUNify CHASE, inside the readiness checklist: a way in, when the
	link last read back from CHASE, what waits for the release, and the accepted working papers that
	do not reach CHASE, with the reason (only for those who read the papers), and for system admins
	"sync now". The checklist reads the link and the papers; this shows them.
-->
<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime';
	import type { keptBackPapers } from '#lib/helpers/chaseTransfer';
	import ChaseSyncButton from '#lib/components/ChaseSyncButton.svelte';

	interface Props {
		conferenceId: string;
		remoteUrl: string;
		lastReconcileAt?: Date | string | null;
		assignmentReleased: boolean;
		keptBack: ReturnType<typeof keptBackPapers>;
	}

	let { conferenceId, remoteUrl, lastReconcileAt, assignmentReleased, keptBack }: Props = $props();

	const chaseUrl = $derived(`${remoteUrl.replace(/\/+$/, '')}/app/${conferenceId}`);
</script>

<div class="flex flex-col gap-3" data-testid="chase-status">
	<div class="flex flex-wrap items-center gap-3">
		<a class="btn btn-primary btn-sm" href={chaseUrl} target="_blank" rel="noopener">
			<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
			{m.chaseStatusOpen()}
		</a>
		<span class="text-base-content/70 text-sm">
			{lastReconcileAt
				? m.chaseStatusLastRead({
						time: new Date(lastReconcileAt).toLocaleString(getLocale(), {
							dateStyle: 'short',
							timeStyle: 'short'
						})
					})
				: m.chaseStatusNotReadYet()}
		</span>
		<ChaseSyncButton small />
	</div>
	{#if !assignmentReleased}
		<p class="text-base-content/70 text-sm">{m.chaseStatusWaitingForRelease()}</p>
	{/if}
	{#if keptBack.length > 0}
		<div class="flex flex-col gap-1">
			<span class="text-sm font-semibold">{m.chaseStatusKeptBack()}</span>
			<ul class="flex flex-col gap-1 text-sm">
				{#each keptBack as paper (paper.id)}
					<li>
						<a
							class="link"
							href={resolve('/(authenticated)/dashboard/[conferenceId]/paperhub/view/[paperId]', {
								conferenceId,
								paperId: paper.id
							})}>{paper.label || m.chaseStatusPaper()}</a
						>
						<span class="text-base-content/60"
							>: {paper.issue === 'noAgendaItem'
								? m.chaseStatusNoAgendaItem()
								: m.chaseStatusNoSeat()}</span
						>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>
