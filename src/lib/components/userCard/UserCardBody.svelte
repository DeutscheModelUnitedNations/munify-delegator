<script lang="ts">
	import { onMount } from 'svelte';
	import { MediaQuery, SvelteSet } from 'svelte/reactivity';
	import { logger } from '#lib/logger';
	import { m } from '#lib/paraglide/messages';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { getCurrentUser } from '#lib/state/currentUser.svelte.js';
	import { readsWholePerson } from './personFacts';
	import {
		fetchUserCardRoles,
		hasConferenceAccess,
		isApplicationTime,
		participationStage
	} from './userCardRoles';
	import PersonDetails from './sidebar/PersonDetails.svelte';
	import FormalitiesTabIcon from './FormalitiesTabIcon.svelte';
	import UserCardSidebar from './UserCardSidebar.svelte';
	import UserCardTabContent from './UserCardTabContent.svelte';
	import UserCardTabs from './UserCardTabs.svelte';
	import {
		nextUserCardTabToPrefetch,
		openingUserCardTab,
		shownUserCardTab,
		visibleUserCardTabs,
		type UserCardTab
	} from './userCardTabs';
	import { seatOf } from '#lib/components/calendar/calendarNow';
	import LoadError from '#lib/components/LoadError.svelte';
	import UserCardNotFound from './UserCardNotFound.svelte';
	import PrefetchedTab from './PrefetchedTab.svelte';
	import TabReady from './TabReady.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
		mode: 'drawer' | 'page';
		/** The tab picked last, which may not exist for this person */
		activeTab: UserCardTab | null;
	}

	let { userId, conferenceId, mode, activeTab = $bindable() }: Props = $props();

	const [roles, me, teamAccess] = $derived(
		await Promise.all([
			fetchUserCardRoles({ userId, conferenceId }),
			getCurrentUser(),
			fetchTeamAccess(conferenceId)
		])
	);

	const user = $derived(roles.users.at(0));
	const delegationMember = $derived(roles.delegationMembers.at(0));
	const singleParticipant = $derived(roles.singleParticipants.at(0));
	const conferenceSupervisor = $derived(roles.conferenceSupervisors.at(0));
	const teamMember = $derived(roles.teamMembers.at(0));
	const participant = $derived(roles.participants.at(0));
	const waitingListEntry = $derived(roles.waitingListEntries.at(0));
	const papers = $derived(roles.papers.length > 0);
	const conferenceState = $derived(roles.conference.state);

	const access = $derived(
		hasConferenceAccess({ delegationMember, singleParticipant, conferenceSupervisor, teamMember })
	);
	const registered = $derived(!!delegationMember || !!singleParticipant || !!conferenceSupervisor);
	// Opened from a search or a link for somebody who has no part in this conference at all
	const student = $derived(!!delegationMember || !!singleParticipant);
	const inConference = $derived(registered || !!teamMember || !!waitingListEntry);

	const wholePerson = $derived(
		readsWholePerson({
			access: teamAccess,
			self: me.sub === userId,
			onTeam: !!teamMember,
			inConference
		})
	);

	const stage = $derived(
		participationStage({
			application: delegationMember?.delegation ?? singleParticipant,
			waitingListEntry,
			conferenceState
		})
	);

	// Where the side column stands beside the tabs (`LAYOUTS`). Assumed while the page hydrates, as the
	// server does.
	const wideCard = {
		drawer: new MediaQuery('width >= 64rem'),
		page: new MediaQuery('width >= 80rem')
	};
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
	const narrow = $derived(mounted && !wideCard[mode].current);

	const tabFlags = $derived({
		registered,
		waiting: !!waitingListEntry,
		participant: !!participant,
		access,
		team: !!teamMember,
		papers,
		narrow
	});
	const tabs = $derived(visibleUserCardTabs(tabFlags));
	const shownTab = $derived(
		shownUserCardTab({ picked: activeTab, opening: openingUserCardTab(tabFlags), visible: tabs })
	);

	const delegationId = $derived(delegationMember?.delegation.id);
	const singleParticipantId = $derived(singleParticipant?.id);
	const supervisorId = $derived(conferenceSupervisor?.id);
	// The ids the schedule's tracks are for, read out once so the calendar tab gets plain values
	const seat = $derived(seatOf({ delegationMember, singleParticipant }));

	const LAYOUTS = {
		drawer: {
			wide: true,
			frame: 'overflow-y-auto lg:flex-row lg:overflow-hidden',
			aside: 'lg:w-84 lg:overflow-y-auto',
			main: 'lg:min-h-0 lg:flex-1',
			// clear of the drawer's own buttons
			tabs: 'lg:pr-24',
			content: 'lg:flex-1 lg:overflow-y-auto'
		},
		page: {
			wide: undefined,
			frame: 'xl:flex-row xl:items-start xl:gap-2',
			// sticky stacks on its own, so it is lifted while one of its modals is open
			aside: 'xl:sticky xl:top-2 xl:w-84 has-[.modal-open]:z-50',
			main: 'xl:flex-1',
			tabs: '',
			content: ''
		}
	};
	const layout = $derived(LAYOUTS[mode]);

	// The other tabs load in the background, one at a time while the browser is idle, once the shown
	// one has its data: each is rendered hidden until its queries have answered, which leaves their
	// results in the client's cache, so opening it later shows them at once and refreshes behind.
	const person = $derived(`${userId}:${conferenceId}`);
	const loaded = $derived.by(() => {
		void person;
		return new SvelteSet<UserCardTab>();
	});
	let prefetching = $state<{ person: string; tab: UserCardTab } | null>(null);
	const prefetchTab = $derived(
		prefetching?.person === person && prefetching.tab !== shownTab ? prefetching.tab : undefined
	);

	function whenIdle(run: () => void) {
		if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 2000 });
		else setTimeout(run, 200);
	}

	function tabLoaded(tab: UserCardTab) {
		const of = person;
		loaded.add(tab);
		if (prefetching?.tab === tab) prefetching = null;
		whenIdle(() => {
			if (of !== person || prefetching) return;
			const next = nextUserCardTabToPrefetch({ visible: tabs, shown: shownTab, loaded });
			if (next) prefetching = { person: of, tab: next };
		});
	}
</script>

{#snippet formalitiesIcon(icon: string)}
	<FormalitiesTabIcon
		{icon}
		{userId}
		{conferenceId}
		isConferenceSupervisor={!!conferenceSupervisor}
	/>
{/snippet}

{#snippet facts()}
	<PersonDetails {userId} {conferenceId} {wholePerson} {student} participant={!!participant} />
{/snippet}

{#snippet tabContent(tab: UserCardTab)}
	{#if tab === 'person'}
		{@render facts()}
	{:else}
		<UserCardTabContent
			{tab}
			{userId}
			{conferenceId}
			{delegationId}
			{singleParticipantId}
			{supervisorId}
			{seat}
			{inConference}
			{access}
			onSite={conferenceState === 'ACTIVE' || conferenceState === 'POST'}
			schedule={access && !teamMember}
			papers={papers || !!delegationId}
			waiting={stage === 'waitingList'}
			applying={isApplicationTime(conferenceState)}
		/>
	{/if}
{/snippet}

{#if !user}
	<UserCardNotFound {userId} />
{:else}
	<!-- `data-wide`: the card has the window to itself, so a wide window has room for more columns. -->
	<!-- The side column beside the tabs where there is room, each scrolling on its own in the drawer. A
	     narrow card scrolls as a whole, who the person is above the tabs and their details in one. -->
	<div
		class="group/card flex min-h-0 flex-1 flex-col {layout.frame}"
		data-wide={layout.wide}
		data-vaul-no-drag
	>
		<UserCardSidebar
			class="shrink-0 {layout.aside}"
			{userId}
			{conferenceId}
			givenName={user.givenName}
			familyName={user.familyName}
			pronouns={user.pronouns}
			{delegationMember}
			{singleParticipant}
			{conferenceSupervisor}
			{teamMember}
			{mode}
			{stage}
			{access}
			facts={narrow ? undefined : facts}
			onOpenFormalities={() => (activeTab = 'formalities')}
		/>

		<div class="flex min-w-0 flex-col {layout.main}">
			<div class="bg-base-100 sticky top-0 z-10 px-4 pt-2 sm:px-5 {layout.tabs}">
				<UserCardTabs
					{tabs}
					activeTab={shownTab}
					onTabChange={(tab) => (activeTab = tab)}
					{formalitiesIcon}
				/>
			</div>

			{#if !inConference}
				<div class="alert alert-warning mx-3 mt-3 sm:mx-5" role="status">
					<i aria-hidden="true" class="ph-duotone ph-warning"></i>
					<span>{m.notInConference()}</span>
				</div>
			{/if}

			<div class="px-4 pt-4 pb-6 sm:px-8 {layout.content}" data-tour="team.userCard.content">
				<!-- Keyed so every tab fetches what it shows when it is opened, behind its own skeleton. -->
				{#key shownTab}
					<svelte:boundary onerror={(error) => logger.error('Failed to load user card tab', error)}>
						{@render tabContent(shownTab)}
						<TabReady onready={() => tabLoaded(shownTab)} />

						{#snippet pending()}
							<div class="flex flex-col gap-3">
								<div class="skeleton h-24 w-full"></div>
								<div class="skeleton h-24 w-full"></div>
							</div>
						{/snippet}

						{#snippet failed(_error, reset)}
							<LoadError onretry={reset} />
						{/snippet}
					</svelte:boundary>
				{/key}

				{#if prefetchTab}
					{#each [prefetchTab] as tab (tab)}
						<PrefetchedTab onready={() => tabLoaded(tab)}>
							{@render tabContent(tab)}
						</PrefetchedTab>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}
