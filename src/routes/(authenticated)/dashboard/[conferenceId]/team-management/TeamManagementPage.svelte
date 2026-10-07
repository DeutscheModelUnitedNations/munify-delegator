<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '$lib/paraglide/messages';
	import InviteTeamMembersModal from '$lib/components/teamManagement/InviteTeamMembersModal.svelte';

	/** A team management page: its title, the button that invites team members, and its content. */
	interface Props {
		title: string;
		conferenceId: string;
		children: Snippet;
	}

	let { title, conferenceId, children }: Props = $props();

	let inviteMembersModalOpen = $state(false);
</script>

<div class="flex flex-col gap-4 p-6">
	<div class="flex justify-between items-center">
		<h1 class="text-3xl font-bold">{title}</h1>
		<div class="flex gap-2">
			<button class="btn btn-primary" onclick={() => (inviteMembersModalOpen = true)}>
				<i class="fa-duotone fa-envelope"></i>
				{m.inviteTeamMembers()}
			</button>
		</div>
	</div>

	{@render children()}
</div>

{#if inviteMembersModalOpen}
	<InviteTeamMembersModal bind:open={inviteMembersModalOpen} {conferenceId} />
{/if}
