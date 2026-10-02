<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import Flag from '$lib/components/Flag.svelte';
	import defaultImage from '$assets/dmun-stock/bw1.jpg';

	import {
		participationOf,
		roleIcon as roleIconOf,
		roleText as roleTextOf,
		type ApplicationStatus
	} from './myConferenceCardParticipation';
	import { client } from '$lib/api/rumbleClient/client';
	import { fetchMyParticipation } from '$lib/api/myConferenceParticipation';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';

	interface Props {
		conferenceId: string;
	}

	let { conferenceId }: Props = $props();

	const currentUser = await getCurrentUser();

	const [conference, myParticipation] = $derived(
		await Promise.all([
			client.liveQuery.conference({
				__args: { id: conferenceId },
				id: true,
				title: true,
				longTitle: true,
				location: true,
				website: true,
				imageDataURL: true,
				state: true,
				startConference: true,
				endConference: true
			}),
			fetchMyParticipation(conferenceId)
		])
	);

	/**
	 * A supervisor's card counts their students, which only a supervisor needs fetched. Keyed by the
	 * id alone, so a live update of the participation does not issue this query again.
	 */
	const supervisorId = $derived(myParticipation?.supervisor?.id);
	const supervisedStudents = $derived(
		supervisorId
			? await client.liveQuery.conferenceSupervisor({
					__args: { id: supervisorId },
					supervisedDelegationMembers: {
						id: true,
						delegation: {
							assignedNation: { alpha2Code: true },
							assignedNonStateActor: { id: true }
						}
					},
					supervisedSingleParticipants: { id: true, assignedRole: { id: true } }
				})
			: undefined
	);

	const participation = $derived(
		participationOf(myParticipation, supervisedStudents, conference.state)
	);

	const statusDisplay: Record<
		ApplicationStatus,
		{ badge: string; icon: string; text: () => string }
	> = {
		accepted: { badge: 'badge-success', icon: 'fa-check', text: m.statusAccepted },
		pending: { badge: 'badge-warning', icon: 'fa-clock', text: m.statusPending },
		applied: { badge: 'badge-info', icon: 'fa-paper-plane', text: m.statusApplied },
		rejected: { badge: 'badge-error', icon: 'fa-times', text: m.statusRejected }
	};

	const statusBadgeClass = $derived(statusDisplay[participation.status].badge);
	const statusIcon = $derived(statusDisplay[participation.status].icon);
	const statusText = $derived(statusDisplay[participation.status].text());

	const roleIcon = $derived(roleIconOf(participation));
	const roleText = $derived(roleTextOf(participation));

	const dateOptions: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	};

	const formattedDateRange = $derived.by(() => {
		const start = new Date(conference.startConference).toLocaleDateString(getLocale(), dateOptions);
		const end = new Date(conference.endConference).toLocaleDateString(getLocale(), dateOptions);
		return `${start} - ${end}`;
	});

	const isRejected = $derived(participation.status === 'rejected');
	// Listed without any part in it: only a system admin sees conferences like that, and has no
	// application status to show.
	const isAdminOnly = $derived(currentUser.isAdmin && participation.type === 'unknown');
</script>

<div
	class="card bg-base-100 border-base-200 border shadow-md transition-all duration-200 hover:shadow-lg {isRejected
		? 'opacity-60'
		: ''}"
>
	<div class="card-body p-4 sm:p-6">
		<!-- Header with image and title -->
		<div class="flex flex-col gap-4 sm:flex-row">
			<!-- Conference Image -->
			<div class="shrink-0">
				<figure
					class="aspect-video h-24 w-auto overflow-hidden rounded-lg sm:h-28 sm:w-44 {isRejected
						? 'grayscale'
						: ''}"
				>
					<img
						src={conference.imageDataURL || defaultImage}
						alt={conference.title}
						class="h-full w-full object-cover"
					/>
				</figure>
			</div>

			<!-- Title and Status -->
			<div class="flex flex-1 flex-col">
				<div class="flex flex-wrap items-start justify-between gap-2">
					<div class="flex-1">
						<h3 class="card-title text-lg">{conference.title}</h3>
						{#if conference.longTitle}
							<p class="text-base-content/70 mt-0.5 text-sm">{conference.longTitle}</p>
						{/if}
					</div>
					{#if !isAdminOnly}
						<div class="badge {statusBadgeClass} gap-1">
							<i class="fa-solid {statusIcon} text-xs"></i>
							{statusText}
						</div>
					{/if}
				</div>

				<!-- Date and Location -->
				<div class="text-base-content/60 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
					<span class="flex items-center gap-1.5">
						<i class="fa-duotone fa-calendar text-xs"></i>
						{formattedDateRange}
					</span>
					{#if conference.location}
						<span class="flex items-center gap-1.5">
							<i class="fa-duotone fa-map-marker-alt text-xs"></i>
							{conference.location}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Role Information -->
		<div class="bg-base-200/50 mt-4 rounded-lg p-3">
			<div class="flex items-center gap-3">
				<!-- Flag/Icon -->
				{#if participation.type === 'delegation' && (participation.country || participation.nonStateActor)}
					<Flag
						alpha2Code={participation.country?.alpha2Code}
						nsa={!!participation.nonStateActor}
						icon={participation.nonStateActor?.fontAwesomeIcon}
						size="xs"
					/>
				{:else if isAdminOnly}
					<div
						class="bg-base-300 flex h-[1.5rem] w-[2rem] shrink-0 items-center justify-center rounded"
					>
						<i class="fa-solid fa-user-shield text-sm"></i>
					</div>
				{:else if roleIcon}
					<div
						class="bg-base-300 flex h-[1.5rem] w-[2rem] shrink-0 items-center justify-center rounded"
					>
						<i class="fa-solid {roleIcon} text-sm"></i>
					</div>
				{/if}

				<!-- Role Text -->
				<div class="flex-1">
					<p class="font-medium">{isAdminOnly ? m.systemAdmin() : roleText}</p>
					{#if isAdminOnly}
						<p class="text-base-content/60 text-sm">{m.systemAdminNotParticipating()}</p>
					{/if}
					{#if participation.type === 'delegation' && participation.committee}
						<p class="text-base-content/60 text-sm">
							{participation.committee.name} ({participation.committee.abbreviation})
							{#if participation.isHeadDelegate}
								<span class="badge badge-sm badge-outline ml-1">{m.headDelegate()}</span>
							{/if}
						</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="card-actions mt-4 justify-end">
			{#if conference.website}
				<a
					href={conference.website}
					target="_blank"
					rel="external noopener noreferrer"
					class="btn btn-ghost btn-sm"
				>
					<i class="fa-duotone fa-globe"></i>
					{m.conferenceInfo()}
				</a>
			{/if}
			<a
				href={resolve('/(authenticated)/dashboard/[conferenceId]', { conferenceId: conference.id })}
				class="btn btn-primary btn-sm"
			>
				{m.goToDashboard()}
				<i class="fa-solid fa-arrow-right"></i>
			</a>
		</div>
	</div>
</div>
