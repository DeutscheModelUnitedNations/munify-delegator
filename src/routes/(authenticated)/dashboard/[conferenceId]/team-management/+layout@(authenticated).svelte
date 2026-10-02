<script lang="ts">
	import type { LayoutProps } from './$types';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import ConferenceSidebarLayout from '$lib/components/ConferenceSidebarLayout.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children, params }: LayoutProps = $props();
	let navbarExpanded = $state(true);
</script>

<ConferenceSidebarLayout
	conferenceId={params.conferenceId}
	navigateBackHref={`/dashboard/${params.conferenceId}`}
	bind:expanded={navbarExpanded}
>
	{#snippet nav()}
		<NavMenuButton
			href={`/dashboard/${params.conferenceId}/team-management/members`}
			icon="fa-users"
			title={m.teamMembers()}
			bind:expanded={navbarExpanded}
		/>
		<NavMenuButton
			href={`/dashboard/${params.conferenceId}/team-management/invitations`}
			icon="fa-envelope"
			title={m.pendingInvitations()}
			bind:expanded={navbarExpanded}
		/>
	{/snippet}

	{@render children()}
</ConferenceSidebarLayout>
