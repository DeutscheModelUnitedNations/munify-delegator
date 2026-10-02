<script lang="ts">
	import type { LayoutProps } from './$types';
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import NavMenuDetails from '$lib/components/navMenu/NavMenuDetails.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import CommandPalette from '$lib/components/commandPalette/CommandPalette.svelte';
	import UserCardDrawer from '$lib/components/userCard/UserCardDrawer.svelte';
	import { m } from '$lib/paraglide/messages';

	let { children, params }: LayoutProps = $props();
	let navbarExpanded = $state(true);
</script>

<div class="flex min-w-0 grow basis-0 overflow-hidden">
	<SideNavigationDrawer navigateBackHref="/management" bind:expanded={navbarExpanded}>
		<NavMenu>
			<NavMenuButton
				href={`/management/${params.conferenceId}/stats`}
				icon="fa-chart-pie"
				title={m.adminStats()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${params.conferenceId}/configuration`}
				icon="fa-gears"
				title={m.settings()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${params.conferenceId}/seats`}
				icon="fa-chair-office"
				title={m.seats()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href="/management/{params.conferenceId}/participants"
				icon="fa-users"
				title={m.adminUsers()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${params.conferenceId}/waitingList`}
				icon="fa-user-clock"
				title={m.waitingList()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuDetails title={m.navWorkflows()} icon="fa-arrows-spin" small={!navbarExpanded}>
				<NavMenuButton
					href="/management/{params.conferenceId}/assignment"
					icon="fa-shuffle"
					title={m.adminAssignment()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/postalRegistration"
					icon="fa-envelope"
					title={m.postalRegistration()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/payments"
					icon="fa-money-bill-transfer"
					title={m.payment()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/accessFlow"
					icon="fa-id-card-clip"
					title={m.accessFlow()}
					bind:expanded={navbarExpanded}
				/>
			</NavMenuDetails>
			<NavMenuDetails title={m.navInfo()} icon="fa-comments" small={!navbarExpanded}>
				<NavMenuButton
					href="/management/{params.conferenceId}/announcement"
					icon="fa-bullhorn"
					title={m.announcementSectionTitle()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/calendar"
					icon="fa-calendar-days"
					title={m.calendar()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/survey"
					icon="fa-chart-pie"
					title={m.survey()}
					bind:expanded={navbarExpanded}
				/>
			</NavMenuDetails>

			<NavMenuDetails title={m.navMaintenance()} icon="fa-toolbox" small={!navbarExpanded}>
				<NavMenuButton
					href="/management/{params.conferenceId}/plausibility"
					icon="fa-shield-check"
					title={m.adminPlausibility()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/cleanup"
					icon="fa-broom"
					title={m.cleanup()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/helper"
					icon="fa-gear-code"
					title={m.helper()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/import"
					icon="fa-file-import"
					title={m.import()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{params.conferenceId}/downloads"
					icon="fa-download"
					title={m.downloads()}
					bind:expanded={navbarExpanded}
				/>
			</NavMenuDetails>
			<NavMenuButton
				href="/dashboard/{params.conferenceId}/team-management"
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

<UserCardDrawer conferenceId={params.conferenceId} />
<CommandPalette conferenceId={params.conferenceId} />
