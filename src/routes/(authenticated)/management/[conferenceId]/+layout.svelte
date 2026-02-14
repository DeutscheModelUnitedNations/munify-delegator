<script lang="ts">
	import NavMenu from '$lib/components/NavMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/NavMenu/NavMenuButton.svelte';
	import NavMenuDetails from '$lib/components/NavMenu/NavMenuDetails.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let navbarExpanded = $state(true);
</script>

<div class="flex min-w-0 grow basis-0 overflow-hidden">
	<SideNavigationDrawer navigateBackHref="/management" bind:expanded={navbarExpanded}>
		<NavMenu>
			<NavMenuButton
				href={`/management/${data.conferenceId}/stats`}
				icon="fa-chart-pie"
				title={m.adminStats()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${data.conferenceId}/configuration`}
				icon="fa-gears"
				title={m.settings()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${data.conferenceId}/seats`}
				icon="fa-chair-office"
				title={m.seats()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href={`/management/${data.conferenceId}/waitingList`}
				icon="fa-user-clock"
				title={m.waitingList()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuDetails title={m.tables()} icon="fa-database" small={!navbarExpanded}>
				<NavMenuButton
					href="/management/{data.conferenceId}/participants"
					icon="fa-users"
					title={m.adminUsers()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/delegations"
					icon="fa-users-viewfinder"
					title={m.adminDelegations()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/individuals"
					icon="fa-user"
					title={m.adminSingleParticipants()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/supervisors"
					icon="fa-chalkboard-user"
					title={m.adminSupervisors()}
					bind:expanded={navbarExpanded}
				/>
			</NavMenuDetails>
			<NavMenuButton
				href="/management/{data.conferenceId}/calendar"
				icon="fa-calendar-days"
				title={m.calendar()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href="/management/{data.conferenceId}/survey"
				icon="fa-chart-pie"
				title={m.survey()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuDetails title={m.tools()} icon="fa-wrench" small={!navbarExpanded}>
				<NavMenuButton
					href="/management/{data.conferenceId}/plausibility"
					icon="fa-shield-check"
					title={m.adminPlausibility()}
					bind:expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/assignment"
					icon="fa-shuffle"
					title={m.adminAssignment()}
					expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/postalRegistration"
					icon="fa-envelope"
					title={m.postalRegistration()}
					expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/payments"
					icon="fa-money-bill-transfer"
					title={m.payment()}
					expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/helper"
					icon="fa-gear-code"
					title={m.helper()}
					expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/cleanup"
					icon="fa-broom"
					title={m.cleanup()}
					expanded={navbarExpanded}
				/>
				<NavMenuButton
					href="/management/{data.conferenceId}/import"
					icon="fa-file-import"
					title={m.import()}
					expanded={navbarExpanded}
				/>
			</NavMenuDetails>
			<NavMenuButton
				href="/management/{data.conferenceId}/downloads"
				icon="fa-download"
				title={m.downloads()}
				bind:expanded={navbarExpanded}
			/>
			<NavMenuButton
				href="/dashboard/{data.conferenceId}/team-management"
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
