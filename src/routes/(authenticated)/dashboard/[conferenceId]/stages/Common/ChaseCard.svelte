<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchActiveChaseLink } from '#lib/api/chaseLink';
	import { chaseIntroOpen, chasePlaceOf } from '#lib/helpers/chaseLinks';
	import DashboardSection from '#lib/components/dashboard/DashboardSection.svelte';

	/**
	 * Where the participant works during the conference: their committee in the linked MUNify CHASE
	 * and its manual for their role, so they can look around before they arrive. Only while an
	 * instance is linked, and only for someone with a part there (`chaseRoleOf`), from the day the intro mail goes out.
	 */
	let { conferenceId, userId }: { conferenceId: string; userId: string } = $props();

	const [chaseLink, conference, members, singles] = $derived(
		await Promise.all([
			fetchActiveChaseLink(),
			client.liveQuery.conference({ __args: { id: conferenceId }, startConference: true }),
			client.liveQuery.delegationMembers({
				__args: {
					where: { conference: { id: { eq: conferenceId } }, user: { id: { eq: userId } } }
				},
				assignedCommittee: { id: true },
				delegation: { assignedRole: { kind: true } }
			}),
			client.liveQuery.singleParticipants({
				__args: {
					where: { conference: { id: { eq: conferenceId } }, user: { id: { eq: userId } } }
				},
				assignedRole: { kind: true }
			})
		])
	);

	const place = $derived(
		chaseLink && chaseIntroOpen({ startConference: conference?.startConference })
			? chasePlaceOf({
					chaseUrl: chaseLink.remoteUrl,
					conferenceId,
					member: members.at(0),
					single: singles.at(0)
				})
			: undefined
	);
</script>

{#if place}
	<DashboardSection icon="gavel" title={m.chaseCardTitle()} description={m.chaseCardDescription()}>
		<div class="flex flex-col gap-3">
			<div class="flex flex-wrap gap-2">
				<a class="btn btn-primary" href={place.links.app} target="_blank" rel="noopener">
					<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
					{place.role === 'DELEGATE' ? m.chaseCardOpenCommittee() : m.chaseCardOpenConference()}
				</a>
				<a class="btn" href={place.links.manual} target="_blank" rel="noopener">
					<i aria-hidden="true" class="ph-duotone ph-book"></i>
					{m.chaseCardManual()}
				</a>
			</div>
			{#if place.role === 'NSA'}
				<p class="text-base-content/70 text-sm">
					{m.chaseCardNsaHint()}
					<a
						class="link"
						href={resolve('/(authenticated)/dashboard/[conferenceId]/registration-mode', {
							conferenceId
						})}
					>
						{m.chaseCardNsaNametag()}
					</a>
				</p>
			{/if}
		</div>
	</DashboardSection>
{/if}
