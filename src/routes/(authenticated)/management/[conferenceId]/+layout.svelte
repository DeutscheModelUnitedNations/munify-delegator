<script lang="ts">
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import { page } from '$app/state';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import NavMenuDetails from '$lib/components/navMenu/NavMenuDetails.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import CommandPalette from '$lib/components/commandPalette/CommandPalette.svelte';
	import UserCardDrawer from '$lib/components/userCard/UserCardDrawer.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { children }: { children: Snippet } = $props();
	let navbarExpanded = $state(true);
</script>

<div class="flex min-w-0 grow basis-0 overflow-hidden">
	<SideNavigationDrawer navigateBackHref="/management" bind:expanded={navbarExpanded}>
		<NavMenu>
			<NavMenuButton
				href={`/management/${page.params.conferenceId!}/stats`}
				icon="fa-chart-pie"
				title={m.adminStats()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${page.params.conferenceId!}/configuration`}
				icon="fa-gears"
				title={m.settings()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${page.params.conferenceId!}/seats`}
				icon="fa-chair-office"
				title={m.seats()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href="/management/{page.params.conferenceId!}/participants"
				icon="fa-users"
				title={m.adminUsers()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${page.params.conferenceId!}/waitingList`}
				icon="fa-user-clock"
				title={m.waitingList()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuDetails title={m.navWorkflows()} icon="fa-arrows-spin" small={!navbarExpanded}>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/assignment"
					icon="fa-shuffle"
					title={m.adminAssignment()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/postalRegistration"
					icon="fa-envelope"
					title={m.postalRegistration()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/payments"
					icon="fa-money-bill-transfer"
					title={m.payment()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/accessFlow"
					icon="fa-id-card-clip"
					title={m.accessFlow()}
					bind:expanded={navbarExpanded}
				/>
			</NavMenuDetails>
			<NavMenuDetails title={m.navInfo()} icon="fa-comments" small={!navbarExpanded}>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/announcement"
					icon="fa-bullhorn"
					title={m.announcementSectionTitle()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/calendar"
					icon="fa-calendar-days"
					title={m.calendar()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/survey"
					icon="fa-chart-pie"
					title={m.survey()}
					bind:expanded={navbarExpanded}
				/>
			</NavMenuDetails>

			<NavMenuDetails title={m.navMaintenance()} icon="fa-toolbox" small={!navbarExpanded}>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/plausibility"
					icon="fa-shield-check"
					title={m.adminPlausibility()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/cleanup"
					icon="fa-broom"
					title={m.cleanup()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/helper"
					icon="fa-gear-code"
					title={m.helper()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/import"
					icon="fa-file-import"
					title={m.import()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{page.params.conferenceId!}/downloads"
					icon="fa-download"
					title={m.downloads()}
					bind:expanded={navbarExpanded}
				/>
			</NavMenuDetails>
			<NavMenuButton
				href="/dashboard/{page.params.conferenceId!}/team-management"
				icon="fa-user-group"
				title={m.teamManagement()}
				bind:expanded={navbarExpanded}
			/>
		</NavMenu>
	</SideNavigationDrawer>

	<div class="flex h-full min-w-0 grow flex-col px-3">
		{@render children()}
	</div>
</div>

<UserCardDrawer conferenceId={page.params.conferenceId!} />
<CommandPalette conferenceId={page.params.conferenceId!} />
