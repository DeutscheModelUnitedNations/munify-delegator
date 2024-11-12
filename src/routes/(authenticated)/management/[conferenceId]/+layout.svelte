<script lang="ts">
	import NavMenu from '$lib/components/NavMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/NavMenu/NavMenuButton.svelte';
	import NavMenuDetails from '$lib/components/NavMenu/NavMenuDetails.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let navbarExpanded = $state(true);
</script>

<SideNavigationDrawer navigateBackHref="/management" bind:expanded={navbarExpanded}>
	<NavMenu small={!navbarExpanded}>
		<NavMenuButton
			href={`/management/${data.conferenceId}/stats`}
			icon="fa-chart-pie"
			title={m.adminStats()}
			small={!navbarExpanded}
		/>
		<NavMenuButton
			href={`/management/${data.conferenceId}/configuration`}
			icon="fa-gears"
			title={m.settings()}
			small={!navbarExpanded}
		/>
		<NavMenuDetails title={m.tables()} icon="fa-database" small={!navbarExpanded}>
			<NavMenuButton
				href="/management/{data.conferenceId}/participants"
				icon="fa-users"
				title={m.adminUsers()}
				small={!navbarExpanded}
			/>
			<NavMenuButton
				href="/management/{data.conferenceId}/delegations"
				icon="fa-users-viewfinder"
				title={m.adminDelegations()}
				small={!navbarExpanded}
			/>
			<NavMenuButton
				href="/management/{data.conferenceId}/individuals"
				icon="fa-user"
				title={m.adminSingleParticipants()}
				small={!navbarExpanded}
			/>
			<NavMenuButton
				href="/management/{data.conferenceId}/supervisors"
				icon="fa-chalkboard-user"
				title={m.adminSupervisors()}
				small={!navbarExpanded}
			/>
		</NavMenuDetails>
		<NavMenuDetails title={m.tools()} icon="fa-wrench" small={!navbarExpanded}>
			<NavMenuButton
				href="/management/{data.conferenceId}/plausibility"
				icon="fa-shield-check"
				title={m.adminPlausibility()}
				small={!navbarExpanded}
			/>
			<NavMenuButton
				href="/management/{data.conferenceId}/assignment"
				icon="fa-shuffle"
				title={m.adminAssignment()}
				small={!navbarExpanded}
			/>
		</NavMenuDetails>
	</NavMenu>
</SideNavigationDrawer>

<div class="flex h-full w-full px-3">
	{@render children()}
</div>
