<script lang="ts">
	import type { LayoutProps } from './$types';
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { LayoutData } from './$types';
	import UserCardDrawer from '$lib/components/userCard/UserCardDrawer.svelte';

	let { children, params }: LayoutProps = $props();
	let navbarExpanded = $state(true);
</script>

<div class="flex min-w-0 grow basis-0 overflow-hidden">
	<SideNavigationDrawer
		navigateBackHref={`/dashboard/${params.conferenceId}`}
		bind:expanded={navbarExpanded}
	>
		<NavMenu>
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
		</NavMenu>
	</SideNavigationDrawer>

	<div class="flex h-full min-w-0 grow flex-col px-3">
		{@render children()}
	</div>
</div>

<UserCardDrawer conferenceId={params.conferenceId} />
