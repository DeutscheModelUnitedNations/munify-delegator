<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import Flag from '$lib/components/Flag.svelte';
	import defaultImage from '$assets/dmun-stock/bw1.jpg';

	type TeamRole = 'PROJECT_MANAGEMENT' | 'PARTICIPANT_CARE' | 'REVIEWER' | 'MEMBER';

	interface DelegationMember {
		id: string;
		isHeadDelegate: boolean;
		conference: { id: string };
		assignedCommittee: { id: string; abbreviation: string; name: string } | null;
		delegation: {
			id: string;
			applied: boolean;
			assignedNation: { alpha2Code: string; alpha3Code: string } | null;
			assignedNonStateActor: { id: string; name: string; fontAwesomeIcon: string | null } | null;
		};
	}

	interface SingleParticipant {
		id: string;
		conference: { id: string };
		applied: boolean;
		assignedRole: { id: string; name: string; fontAwesomeIcon: string | null } | null;
	}

	interface Supervisor {
		id: string;
		conference: { id: string };
		supervisedDelegationMembers: {
			id: string;
			delegation: {
				assignedNation: { alpha2Code: string } | null;
				assignedNonStateActor: { id: string } | null;
			};
		}[];
		supervisedSingleParticipants: {
			id: string;
			assignedRole: { id: string } | null;
		}[];
	}

	interface TeamMember {
		id: string;
		conference: { id: string };
		role: TeamRole;
	}

	interface Conference {
		id: string;
		title: string;
		longTitle: string | null;
		location: string | null;
		website: string | null;
		imageDataURL: string | null;
		state: string;
		startConference: string;
		endConference: string;
		delegationMembers: DelegationMember[];
		singleParticipants: SingleParticipant[];
		conferenceSupervisors: Supervisor[];
		teamMembers: TeamMember[];
	}

	interface Props {
		conference: Conference;
	}

	let { conference }: Props = $props();

	// Determine participation type and details
	const participation = $derived.by(() => {
		const delegationMember = conference.delegationMembers?.[0];
		const singleParticipant = conference.singleParticipants?.[0];
		const supervisor = conference.conferenceSupervisors?.[0];
		const teamMember = conference.teamMembers?.[0];

		if (teamMember) {
			return {
				type: 'teamMember' as const,
				status: 'accepted' as const,
				teamRole: teamMember.role
			};
		}

		if (delegationMember) {
			const delegation = delegationMember.delegation;
			const hasAssignment = !!delegation.assignedNation || !!delegation.assignedNonStateActor;
			let status: 'accepted' | 'pending' | 'applied' | 'rejected';

			if (hasAssignment) {
				status = 'accepted';
			} else if (!delegation.applied) {
				status = 'pending';
			} else if (conference.state === 'PARTICIPANT_REGISTRATION') {
				status = 'applied';
			} else {
				status = 'rejected';
			}

			return {
				type: 'delegation' as const,
				status,
				country: delegation.assignedNation,
				nonStateActor: delegation.assignedNonStateActor,
				committee: delegationMember.assignedCommittee,
				isHeadDelegate: delegationMember.isHeadDelegate
			};
		}

		if (singleParticipant) {
			let status: 'accepted' | 'pending' | 'applied' | 'rejected';

			if (singleParticipant.assignedRole) {
				status = 'accepted';
			} else if (!singleParticipant.applied) {
				status = 'pending';
			} else if (conference.state === 'PARTICIPANT_REGISTRATION') {
				status = 'applied';
			} else {
				status = 'rejected';
			}

			return {
				type: 'singleParticipant' as const,
				status,
				customRole: singleParticipant.assignedRole
			};
		}

		if (supervisor) {
			const supervisedDelegationMembers = supervisor.supervisedDelegationMembers ?? [];
			const supervisedSingleParticipants = supervisor.supervisedSingleParticipants ?? [];

			const totalStudents =
				supervisedDelegationMembers.length + supervisedSingleParticipants.length;

			const acceptedDelegations = supervisedDelegationMembers.filter(
				(dm) => dm.delegation.assignedNation || dm.delegation.assignedNonStateActor
			);
			const acceptedSingleParticipants = supervisedSingleParticipants.filter(
				(sp) => sp.assignedRole
			);
			const acceptedStudentCount = acceptedDelegations.length + acceptedSingleParticipants.length;

			let status: 'accepted' | 'pending' | 'applied' | 'rejected';

			if (acceptedStudentCount > 0) {
				status = 'accepted';
			} else if (conference.state === 'PARTICIPANT_REGISTRATION') {
				status = 'pending';
			} else {
				status = 'rejected';
			}

			return {
				type: 'supervisor' as const,
				status,
				studentCount: totalStudents,
				acceptedStudentCount
			};
		}

		return {
			type: 'unknown' as const,
			status: 'pending' as const
		};
	});

	const statusBadgeClass = $derived.by(() => {
		switch (participation.status) {
			case 'accepted':
				return 'badge-success';
			case 'pending':
				return 'badge-warning';
			case 'applied':
				return 'badge-info';
			case 'rejected':
				return 'badge-error';
			default:
				return 'badge-ghost';
		}
	});

	const statusIcon = $derived.by(() => {
		switch (participation.status) {
			case 'accepted':
				return 'fa-check';
			case 'pending':
				return 'fa-clock';
			case 'applied':
				return 'fa-paper-plane';
			case 'rejected':
				return 'fa-times';
			default:
				return 'fa-question';
		}
	});

	const statusText = $derived.by(() => {
		switch (participation.status) {
			case 'accepted':
				return m.statusAccepted();
			case 'pending':
				return m.statusPending();
			case 'applied':
				return m.statusApplied();
			case 'rejected':
				return m.statusRejected();
			default:
				return '';
		}
	});

	const roleText = $derived.by(() => {
		if (participation.type === 'delegation') {
			if (participation.country) {
				return m.delegateFor({
					country: getFullTranslatedCountryNameFromISO3Code(participation.country.alpha3Code)
				});
			}
			if (participation.nonStateActor) {
				return m.delegateFor({ country: participation.nonStateActor.name });
			}
			return m.delegation();
		}

		if (participation.type === 'singleParticipant') {
			if (participation.customRole) {
				return participation.customRole.name;
			}
			return m.singleParticipant();
		}

		if (participation.type === 'supervisor') {
			return m.supervisorWithStudents({ count: participation.studentCount ?? 0 });
		}

		if (participation.type === 'teamMember') {
			return m.teamMemberWithRole({ role: getTeamRoleLabel(participation.teamRole) });
		}

		return '';
	});

	function getTeamRoleLabel(role?: TeamRole | null): string {
		switch (role) {
			case 'PROJECT_MANAGEMENT':
				return m.teamRoleProjectManagement();
			case 'PARTICIPANT_CARE':
				return m.teamRoleParticipantCare();
			case 'REVIEWER':
				return m.teamRoleReviewer();
			case 'MEMBER':
			default:
				return m.teamRoleMember();
		}
	}

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
					<div class="badge {statusBadgeClass} gap-1">
						<i class="fa-solid {statusIcon} text-xs"></i>
						{statusText}
					</div>
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
				{:else if participation.type === 'delegation'}
					<div
						class="bg-base-300 flex h-[1.5rem] w-[2rem] shrink-0 items-center justify-center rounded"
					>
						<i class="fa-solid fa-users text-sm"></i>
					</div>
				{:else if participation.type === 'singleParticipant'}
					<div
						class="bg-base-300 flex h-[1.5rem] w-[2rem] shrink-0 items-center justify-center rounded"
					>
						<i
							class="fa-solid fa-{(participation.customRole?.fontAwesomeIcon ?? 'user').replace(
								'fa-',
								''
							)} text-sm"
						></i>
					</div>
				{:else if participation.type === 'supervisor'}
					<div
						class="bg-base-300 flex h-[1.5rem] w-[2rem] shrink-0 items-center justify-center rounded"
					>
						<i class="fa-solid fa-chalkboard-teacher text-sm"></i>
					</div>
				{:else if participation.type === 'teamMember'}
					<div
						class="bg-base-300 flex h-[1.5rem] w-[2rem] shrink-0 items-center justify-center rounded"
					>
						<i class="fa-solid fa-users-gear text-sm"></i>
					</div>
				{/if}

				<!-- Role Text -->
				<div class="flex-1">
					<p class="font-medium">{roleText}</p>
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
					rel="noopener noreferrer"
					class="btn btn-ghost btn-sm"
				>
					<i class="fa-duotone fa-globe"></i>
					{m.conferenceInfo()}
				</a>
			{/if}
			<a href="/dashboard/{conference.id}" class="btn btn-primary btn-sm">
				{m.goToDashboard()}
				<i class="fa-solid fa-arrow-right"></i>
			</a>
		</div>
	</div>
</div>
