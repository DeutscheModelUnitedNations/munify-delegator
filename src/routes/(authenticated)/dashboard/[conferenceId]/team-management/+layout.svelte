<script lang="ts">
	import type { LayoutProps } from './$types';
	import ManagementShell from '../management/ManagementShell.svelte';
	import Tabs from '$lib/components/tabs/Tabs.svelte';
	import Tab from '$lib/components/tabs/Tab.svelte';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages';
	import InviteTeamMembersModal from '$lib/components/teamManagement/InviteTeamMembersModal.svelte';

	let { children, params }: LayoutProps = $props();

	const conferenceId = $derived(params.conferenceId);
	const base = $derived(`/dashboard/${conferenceId}/team-management` as const);
	const onInvitations = $derived(page.url.pathname.startsWith(`${base}/invitations`));

	let inviteMembersModalOpen = $state(false);
</script>

<ManagementShell {conferenceId}>
	<div class="flex items-end justify-between gap-4 px-6 pt-6">
		<Tabs>
			<Tab title={m.teamMembers()} icon="users" active={!onInvitations} href={`${base}/members`} />
			<Tab
				title={m.pendingInvitations()}
				icon="envelope"
				active={onInvitations}
				href={`${base}/invitations`}
			/>
		</Tabs>
		<button class="btn btn-primary btn-sm" onclick={() => (inviteMembersModalOpen = true)}>
			<i class="fa-sharp-duotone fa-solid fa-envelope"></i>
			{m.inviteTeamMembers()}
		</button>
	</div>

	{@render children()}
</ManagementShell>

{#if inviteMembersModalOpen}
	<InviteTeamMembersModal bind:open={inviteMembersModalOpen} {conferenceId} />
{/if}
