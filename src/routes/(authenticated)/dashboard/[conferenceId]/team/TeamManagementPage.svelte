<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages';
	import Tabs from '#lib/components/tabs/Tabs.svelte';
	import Tab from '#lib/components/tabs/Tab.svelte';
	import InviteTeamMembersModal from '#lib/components/teamManagement/InviteTeamMembersModal.svelte';

	/**
	 * A team management page: the Members / Invitations tabs with the invite button, and the
	 * padded content area below them. Not a layout: a route group would hide these pages from the
	 * breadcrumbs, which read the page files' paths.
	 */
	let { children, conferenceId }: { children: Snippet; conferenceId: string } = $props();

	const base = $derived(`/dashboard/${conferenceId}/team` as const);
	const onInvitations = $derived(page.url.pathname.startsWith(`${base}/invitations`));

	let inviteMembersModalOpen = $state(false);
</script>

<div class="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 pt-4 sm:px-6 sm:pt-6">
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

<div class="flex flex-col gap-4 py-4 sm:p-6 sm:pt-4">
	{@render children()}
</div>

{#if inviteMembersModalOpen}
	<InviteTeamMembersModal bind:open={inviteMembersModalOpen} {conferenceId} />
{/if}
