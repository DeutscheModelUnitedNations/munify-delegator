<script lang="ts">
	import type { LayoutProps } from './$types';
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import NavMenuDetails from '$lib/components/navMenu/NavMenuDetails.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import CommandPalette from '$lib/components/commandPalette/CommandPalette.svelte';
	import UserCardDrawer from '$lib/components/userCard/UserCardDrawer.svelte';
	import { m } from '$lib/paraglide/messages';
	import { canPlanSeats, isSeatPlanningOnly } from '$lib/helpers/managementAccess';
	import { managementMembership } from './managementMembership';

	let { children, params }: LayoutProps = $props();

	const membership = $derived(await managementMembership(params.conferenceId));
	const seatPlanningOnly = $derived(isSeatPlanningOnly(membership));
</script>

<div class="flex min-w-0 grow basis-0 overflow-x-clip">
	<SideNavigationDrawer>
		<NavMenu>
			{#if seatPlanningOnly}
				<!-- content leads have no other entry, so no workflow group around it -->
				<NavMenuButton
					href="/dashboard/{params.conferenceId}/management/seat-planning"
					icon="fa-table-cells"
					title={m.seatPlanning()}
				/>
			{:else}
				<NavMenuButton
					href={`/dashboard/${params.conferenceId}/management/stats`}
					icon="fa-chart-pie"
					title={m.adminStats()}
				/>
				<NavMenuButton
					href={`/dashboard/${params.conferenceId}/management/configuration`}
					icon="fa-gears"
					title={m.settings()}
				/>
				<NavMenuButton
					href={`/dashboard/${params.conferenceId}/management/seats`}
					icon="fa-chair-office"
					title={m.seats()}
				/>
				<NavMenuButton
					href="/dashboard/{params.conferenceId}/management/participants"
					icon="fa-users"
					title={m.adminUsers()}
				/>
				<NavMenuButton
					href={`/dashboard/${params.conferenceId}/management/waitingList`}
					icon="fa-user-clock"
					title={m.waitingList()}
				/>
				<NavMenuDetails title={m.navWorkflows()} icon="fa-arrows-spin">
					{#if canPlanSeats(membership)}
						<NavMenuButton
							href="/dashboard/{params.conferenceId}/management/seat-planning"
							icon="fa-table-cells"
							title={m.seatPlanning()}
						/>
					{/if}
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/assignment"
						icon="fa-shuffle"
						title={m.adminAssignment()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/postalRegistration"
						icon="fa-envelope"
						title={m.postalRegistration()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/payments"
						icon="fa-money-bill-transfer"
						title={m.payment()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/accessFlow"
						icon="fa-id-card-clip"
						title={m.accessFlow()}
					/>
				</NavMenuDetails>
				<NavMenuDetails title={m.navInfo()} icon="fa-comments">
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/announcement"
						icon="fa-bullhorn"
						title={m.announcementSectionTitle()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/calendar"
						icon="fa-calendar-days"
						title={m.calendar()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/survey"
						icon="fa-chart-pie"
						title={m.survey()}
					/>
				</NavMenuDetails>

				<NavMenuDetails title={m.navMaintenance()} icon="fa-toolbox">
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/plausibility"
						icon="fa-shield-check"
						title={m.adminPlausibility()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/cleanup"
						icon="fa-broom"
						title={m.cleanup()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/helper"
						icon="fa-gear-code"
						title={m.helper()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/import"
						icon="fa-file-import"
						title={m.import()}
					/>
					<NavMenuButton
						href="/dashboard/{params.conferenceId}/management/downloads"
						icon="fa-download"
						title={m.downloads()}
					/>
				</NavMenuDetails>
				<NavMenuButton
					href="/dashboard/{params.conferenceId}/team-management"
					icon="fa-user-group"
					title={m.teamManagement()}
				/>
			{/if}
		</NavMenu>
	</SideNavigationDrawer>

	<div class="flex h-full min-w-0 grow flex-col px-3">
		{@render children()}
	</div>
</div>

{#if !seatPlanningOnly}
	<UserCardDrawer conferenceId={params.conferenceId} />
	<CommandPalette conferenceId={params.conferenceId} />
{/if}
