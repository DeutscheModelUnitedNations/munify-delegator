<script lang="ts">
	import NavMenu from '$lib/components/NavMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/NavMenu/NavMenuButton.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let navbarExpanded = $state(true);
</script>

<div class="flex min-w-0 grow basis-0 overflow-hidden">
	<SideNavigationDrawer
		navigateBackHref={`/dashboard/${data.conferenceId}`}
		bind:expanded={navbarExpanded}
	>
		<NavMenu>
			<NavMenuButton
				href={`/dashboard/${data.conferenceId}/team-management/members`}
				icon="fa-users"
				title={m.teamMembers()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/dashboard/${data.conferenceId}/team-management/invitations`}
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
