<script lang="ts">
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import { page } from '$app/state';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import UserCardDrawer from '$lib/components/userCard/UserCardDrawer.svelte';

	let { children }: { children: Snippet } = $props();
	let navbarExpanded = $state(true);
</script>

<div class="flex min-w-0 grow basis-0 overflow-hidden">
	<SideNavigationDrawer
		navigateBackHref={`/dashboard/${page.params.conferenceId!}`}
		bind:expanded={navbarExpanded}
	>
		<NavMenu>
			<NavMenuButton
				href={`/dashboard/${page.params.conferenceId!}/team-management/members`}
				icon="fa-users"
				title={m.teamMembers()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/dashboard/${page.params.conferenceId!}/team-management/invitations`}
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

<UserCardDrawer conferenceId={page.params.conferenceId!} />
