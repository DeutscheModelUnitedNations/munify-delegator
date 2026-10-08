<script lang="ts">
	import type { LayoutProps } from './$types';
	import NavMenu from '$lib/components/navMenu/NavMenu.svelte';
	import NavMenuButton from '$lib/components/navMenu/NavMenuButton.svelte';
	import NavMenuDetails from '$lib/components/navMenu/NavMenuDetails.svelte';
	import SideNavigationDrawer from '$lib/components/SideNavigationDrawer.svelte';
	import CommandPalette from '$lib/components/commandPalette/CommandPalette.svelte';
	import { m } from '$lib/paraglide/messages';
	import { canPlanSeats, isSeatPlanningOnly } from '$lib/helpers/managementAccess';
	import { managementMembership } from './managementMembership';

	let { children, params }: LayoutProps = $props();

	// Every navigation hands the layout a fresh `params`, one that only changes the query included;
	// a string that has not changed keeps the membership from being asked for again each time.
	const conferenceId = $derived(params.conferenceId);
	const membership = $derived(await managementMembership(conferenceId));
	const seatPlanningOnly = $derived(isSeatPlanningOnly(membership));
</script>

<div class="flex min-w-0 grow basis-0 overflow-x-clip">
	<SideNavigationDrawer>
		<NavMenu>
			{#if seatPlanningOnly}
				<!-- content leads have no other entry, so no workflow group around it -->
				<NavMenuButton
					href="/dashboard/{conferenceId}/management/seat-planning"
					icon="fa-table-cells"
					title={m.seatPlanning()}
				/>
			{:else}
				<NavMenuButton
					href={`/dashboard/${conferenceId}/management/stats`}
					icon="fa-chart-pie"
					title={m.adminStats()}
				/>
				<NavMenuButton
					href={`/dashboard/${conferenceId}/management/configuration`}
					icon="fa-gears"
					title={m.settings()}
				/>
				<NavMenuButton
					href={`/dashboard/${conferenceId}/management/seats`}
					icon="fa-chair-office"
					title={m.seats()}
				/>
				<NavMenuButton
					href="/dashboard/{conferenceId}/management/participants"
					icon="fa-users"
					title={m.adminUsers()}
				/>
				<NavMenuButton
					href="/dashboard/{conferenceId}/management/delegations"
					icon="fa-users-viewfinder"
					title={m.adminDelegations()}
				/>
				<NavMenuButton
					href="/dashboard/{conferenceId}/management/individuals"
					icon="fa-user"
					title={m.adminSingleParticipants()}
				/>
				<NavMenuButton
					href="/dashboard/{conferenceId}/management/supervisors"
					icon="fa-chalkboard-user"
					title={m.adminSupervisors()}
				/>
				<NavMenuButton
					href={`/dashboard/${conferenceId}/management/waitingList`}
					icon="fa-user-clock"
					title={m.waitingList()}
				/>
				<NavMenuDetails title={m.navWorkflows()} icon="fa-arrows-spin">
					{#if canPlanSeats(membership)}
						<NavMenuButton
							href="/dashboard/{conferenceId}/management/seat-planning"
							icon="fa-table-cells"
							title={m.seatPlanning()}
						/>
					{/if}
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/assignment"
						icon="fa-shuffle"
						title={m.adminAssignment()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/postalRegistration"
						icon="fa-envelope"
						title={m.postalRegistration()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/payments"
						icon="fa-money-bill-transfer"
						title={m.payment()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/accessFlow"
						icon="fa-id-card-clip"
						title={m.accessFlow()}
					/>
				</NavMenuDetails>
				<NavMenuDetails title={m.navInfo()} icon="fa-comments">
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/announcement"
						icon="fa-bullhorn"
						title={m.announcementSectionTitle()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/calendar"
						icon="fa-calendar-days"
						title={m.calendar()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/survey"
						icon="fa-chart-pie"
						title={m.survey()}
					/>
				</NavMenuDetails>

				<NavMenuDetails title={m.navMaintenance()} icon="fa-toolbox">
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/plausibility"
						icon="fa-shield-check"
						title={m.adminPlausibility()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/cleanup"
						icon="fa-broom"
						title={m.cleanup()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/helper"
						icon="fa-gear-code"
						title={m.helper()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/import"
						icon="fa-file-import"
						title={m.import()}
					/>
					<NavMenuButton
						href="/dashboard/{conferenceId}/management/downloads"
						icon="fa-download"
						title={m.downloads()}
					/>
				</NavMenuDetails>
				<NavMenuButton
					href="/dashboard/{conferenceId}/team-management"
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
	<CommandPalette {conferenceId} />
{/if}
