<script lang="ts">
	import { Breadcrumbs } from 'sveltekit-breadcrumbs';
	import type { PathSegment } from 'sveltekit-breadcrumbs';
	import { locales } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages';
	import ConferenceSwitcher from './ConferenceSwitcher.svelte';
	import type { LayoutProps } from './$types';

	type Parameters = keyof LayoutProps['params'];

	interface LocalizedBreadcrumb {
		translation: string;
		icon: string;
	}

	const breadcrumbs: { [key: string]: LocalizedBreadcrumb } = {
		management: {
			translation: m.administration(),
			icon: 'bars-progress'
		},
		'team-management': {
			translation: m.teamCoordination(),
			icon: 'user-group'
		},
		members: {
			translation: m.teamMembers(),
			icon: 'users'
		},
		invitations: {
			translation: m.pendingInvitations(),
			icon: 'envelope'
		},
		delegations: {
			translation: m.delegations(),
			icon: 'users-viewfinder'
		},
		dashboard: {
			translation: m.conferences(),
			icon: 'grid-2'
		},
		registration: {
			translation: m.registration(),
			icon: 'envelope'
		},
		stats: {
			translation: m.statistics(),
			icon: 'chart-simple'
		},
		'create-delegation': {
			translation: m.createDelegation(),
			icon: 'plus'
		},
		'join-delegation': {
			translation: m.joinDelegation(),
			icon: 'arrow-right-to-arc'
		},
		individual: {
			translation: m.individualApplication(),
			icon: 'dice-one'
		},
		roleId: {
			translation: m.role(),
			icon: 'gavel'
		},
		supervisor: {
			translation: m.supervisor(),
			icon: 'eye'
		},
		'my-account': {
			translation: m.myAccount(),
			icon: 'user'
		},
		configuration: {
			translation: m.settings(),
			icon: 'gears'
		},
		participants: {
			translation: m.participants(),
			icon: 'users'
		},
		individuals: {
			translation: m.singleParticipants(),
			icon: 'user'
		},
		supervisors: {
			translation: m.supervisors(),
			icon: 'chalkboard-user'
		},
		plausibility: {
			translation: m.adminPlausibility(),
			icon: 'shield-check'
		},
		seats: {
			translation: m.seats(),
			icon: 'chair-office'
		},
		'seat-planning': {
			translation: m.seatPlanning(),
			icon: 'table-cells'
		},
		committeeAssignment: {
			translation: m.committeeAssignment(),
			icon: 'arrows-turn-to-dots'
		},
		info: {
			translation: m.infos(),
			icon: 'info'
		},
		payment: {
			translation: m.payment(),
			icon: 'hand-holding-circle-dollar'
		},
		postalRegistration: {
			translation: m.postalRegistration(),
			icon: 'envelopes-bulk'
		},
		group: {
			translation: m.groupPayment(),
			icon: 'people-group'
		},
		delegation: {
			translation: m.delegationPayment(),
			icon: 'users-viewfinder'
		},
		single: {
			translation: m.singlePayment(),
			icon: 'user'
		},
		payments: {
			translation: m.payment(),
			icon: 'money-bill-transfer'
		},
		cleanup: {
			icon: 'broom',
			translation: m.cleanup()
		},
		downloads: {
			icon: 'download',
			translation: m.downloads()
		},
		calendar: {
			icon: 'calendar-days',
			translation: m.calendar()
		},
		survey: {
			icon: 'square-poll-horizontal',
			translation: m.survey()
		},
		surveyId: {
			icon: 'magnifying-glass',
			translation: m.details()
		},
		helper: {
			icon: 'gear-code',
			translation: m.helper()
		},
		import: {
			icon: 'file-import',
			translation: m.import()
		},
		connectSupervisor: {
			icon: 'eye',
			translation: m.connectSupervisorTitle()
		},
		seed: {
			icon: 'seedling',
			translation: m.seedConference()
		},
		committees: {
			icon: 'podium',
			translation: m.committees()
		},
		'waiting-list': {
			icon: 'user-clock',
			translation: m.waitingList()
		},
		waitingList: {
			icon: 'user-clock',
			translation: m.waitingList()
		},
		'assignment-assistant': {
			icon: 'robot',
			translation: m.assignmentAssistant()
		},
		projectId: {
			icon: 'folder-open',
			translation: m.project()
		},
		sighting: {
			icon: 'binoculars',
			translation: m.sightings()
		},
		weighting: {
			icon: 'scale-unbalanced',
			translation: m.weighting()
		},
		singles: {
			icon: 'user',
			translation: m.singleParticipants()
		},
		assignment: {
			icon: 'arrows-turn-to-dots',
			translation: m.assignment()
		},
		summary: {
			icon: 'file-chart-column',
			translation: m.summary()
		},
		paperhub: {
			icon: 'files',
			translation: m.paperHub()
		},
		paperId: {
			icon: 'file-magnifying-glass',
			translation: m.paper()
		},
		newPaper: {
			icon: 'file-circle-plus',
			translation: m.newPaper()
		},
		team: {
			icon: 'users-gear',
			translation: m.teamManagement()
		},
		view: {
			icon: 'eye',
			translation: m.view()
		},
		'registration-mode': {
			icon: 'id-card',
			translation: m.registrationMode()
		},
		accessFlow: {
			icon: 'id-card-clip',
			translation: m.accessFlow()
		},
		announcement: {
			icon: 'bullhorn',
			translation: m.announcementSectionTitle()
		},
		attendance: {
			icon: 'barcode-read',
			translation: m.attendanceScanner()
		},
		'team-tender': {
			icon: 'bullhorn',
			translation: m.teamTenderTitle()
		},
		user: {
			icon: 'users',
			translation: m.participants()
		},
		userId: {
			icon: 'user',
			translation: m.adminUserCard()
		}
	};

	type PathSegmentType = PathSegment<Parameters, boolean>;

	function getBreadcrumb(segment: PathSegmentType): LocalizedBreadcrumb {
		const breadcrumb = breadcrumbs[segment.key];
		if (!breadcrumb) {
			console.warn(`Breadcrumb not found: ${segment.key}`);
			return {
				translation: segment.key,
				icon: 'question'
			};
		}

		return breadcrumb;
	}
</script>

{#snippet delimiter()}
	<i class="fa-solid fa-chevron-right text-base-content/30 text-[0.6rem]" aria-hidden="true"></i>
{/snippet}

<!-- ATTENTION: importObject is dir route specific. You cannot move this file without adjusting this
import path via the parameter! The home link is the wordmark in the header, so there is no homePath. -->
<Breadcrumbs
	importObject={import.meta.glob('./**/+page*.svelte')}
	availableLanguageTags={[...locales]}
	delimiterSnippet={delimiter}
>
	{#snippet pathSnippet(pathSegment: PathSegmentType)}
		{#if pathSegment.key === 'conferenceId' && pathSegment.isParameter}
			<ConferenceSwitcher conferenceId={pathSegment.value} />
		{:else}
			{@const breadcrumb = getBreadcrumb(pathSegment)}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- sveltekit-breadcrumbs builds href as an absolute URL (page origin + path), which resolve() cannot take -->
			<a class="btn btn-ghost btn-sm max-w-48 !no-underline" href={pathSegment.href}>
				<i class="fa-duotone fa-{breadcrumb.icon}"></i>
				<span class="ml-1 truncate">{breadcrumb.translation}</span>
			</a>
		{/if}
	{/snippet}
</Breadcrumbs>
