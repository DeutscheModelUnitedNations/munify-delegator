<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import TeamManagementPage from '../TeamManagementPage.svelte';
	import PendingInvitationsTable from '$lib/components/teamManagement/PendingInvitationsTable.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	/** Invitations that are still open: neither accepted nor withdrawn. */
	const pendingInvitations = $derived(
		await client.liveQuery.teamMemberInvitations({
			__args: {
				where: {
					conferenceId: { eq: params.conferenceId },
					usedAt: { isNull: true },
					revokedAt: { isNull: true }
				}
			},
			id: true,
			email: true,
			role: true,
			expiresAt: true,
			userExists: true,
			invitedBy: { givenName: true, familyName: true }
		})
	);
</script>

<TeamManagementPage title={m.pendingInvitations()} conferenceId={params.conferenceId}>
	{#if pendingInvitations.length > 0}
		<PendingInvitationsTable invitations={pendingInvitations} />
	{:else}
		<div class="text-center text-base-content/70 py-8">
			<i class="fa-sharp-duotone fa-solid fa-envelope-open text-4xl mb-4"></i>
			<p>{m.noResults()}</p>
		</div>
	{/if}
</TeamManagementPage>
