<script lang="ts">
	import type { LayoutProps } from './$types';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import ConferenceSidebarLayout from '$lib/components/ConferenceSidebarLayout.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children, params }: LayoutProps = $props();
</script>

<ConferenceSidebarLayout conferenceId={params.conferenceId}>
	{#snippet nav()}
		<NavMenuButton
			href={`/dashboard/${params.conferenceId}/team-management/members`}
			icon="fa-users"
			title={m.teamMembers()}
		/>
		<NavMenuButton
			href={`/dashboard/${params.conferenceId}/team-management/invitations`}
			icon="fa-envelope"
			title={m.pendingInvitations()}
		/>
	{/snippet}

	{@render children()}
</ConferenceSidebarLayout>
