<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import InviteTeamMembersModal from '$lib/components/TeamManagement/InviteTeamMembersModal.svelte';
	import PendingInvitationsTable from '$lib/components/TeamManagement/PendingInvitationsTable.svelte';
	import type { PageData } from './$houdini';

	let { data }: { data: PageData } = $props();

	const invitationsQuery = data.TeamManagementInvitationsQuery;
	let pendingInvitations = $derived($invitationsQuery.data?.findManyTeamMemberInvitations ?? []);

	let inviteMembersModalOpen = $state(false);
</script>

<div class="flex flex-col gap-4 p-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">{m.pendingInvitations()}</h1>
		<div class="flex gap-2">
			<button class="btn btn-primary" onclick={() => (inviteMembersModalOpen = true)}>
				<i class="fa-duotone fa-envelope"></i>
				{m.inviteTeamMembers()}
			</button>
		</div>
	</div>

	{#if pendingInvitations.length > 0}
		<PendingInvitationsTable invitations={pendingInvitations} />
	{:else}
		<div class="text-center text-base-content/70 py-8">
			<i class="fa-duotone fa-envelope-open text-4xl mb-4"></i>
			<p>{m.noResults()}</p>
		</div>
	{/if}
</div>

{#if inviteMembersModalOpen}
	<InviteTeamMembersModal bind:open={inviteMembersModalOpen} conferenceId={data.conferenceId} />
{/if}
