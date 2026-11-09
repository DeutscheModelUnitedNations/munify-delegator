<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { getLocale } from '#lib/paraglide/runtime';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchActiveChaseLink } from '#lib/api/chaseLink';
	import { keptBackPapers } from '#lib/helpers/chaseTransfer';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';

	/**
	 * The conference in the linked MUNify CHASE, for the team: a way in, when the link last read
	 * back from CHASE, what waits for the release, and the accepted working papers that do not reach
	 * CHASE, with the reason (only for those who read the papers). Nothing while unlinked.
	 */
	let { conferenceId }: { conferenceId: string } = $props();

	const [chaseLink, conference, papers] = $derived(
		await Promise.all([
			fetchActiveChaseLink(),
			client.liveQuery.conference({ __args: { id: conferenceId }, assignmentReleased: true }),
			client.liveQuery.papers({
				__args: {
					where: {
						type: 'WORKING_PAPER',
						delegation: { conferenceId: { eq: conferenceId } },
						versions: { status: 'ACCEPTED' }
					}
				},
				id: true,
				agendaItem: { title: true, committee: { abbreviation: true, roles: { id: true } } },
				delegation: { assignedRoleId: true, assignedRole: { name: true, nationAlpha3Code: true } }
			})
		])
	);

	const keptBack = $derived(keptBackPapers(papers));
</script>

{#if chaseLink}
	<DashboardSection icon="gavel" title={m.chaseStatusTitle()}>
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap items-center gap-3">
				<a
					class="btn btn-primary btn-sm"
					href={`${chaseLink.remoteUrl.replace(/\/+$/, '')}/app/${conferenceId}`}
					target="_blank"
					rel="noopener"
				>
					<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
					{m.chaseStatusOpen()}
				</a>
				<span class="text-base-content/70 text-sm">
					{chaseLink.lastReconcileAt
						? m.chaseStatusLastRead({
								time: new Date(chaseLink.lastReconcileAt).toLocaleString(getLocale(), {
									dateStyle: 'short',
									timeStyle: 'short'
								})
							})
						: m.chaseStatusNotReadYet()}
				</span>
			</div>
			{#if !conference.assignmentReleased}
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
									href={resolve(
										'/(authenticated)/dashboard/[conferenceId]/paperhub/view/[paperId]',
										{
											conferenceId,
											paperId: paper.id
										}
									)}>{paper.label || m.chaseStatusPaper()}</a
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
	</DashboardSection>
{/if}
