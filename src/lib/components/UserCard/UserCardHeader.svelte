<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import formatNames from '$lib/services/formatNames';
	import { translateTeamRole } from '$lib/services/enumTranslations';

	interface Props {
		userId: string;
		conferenceId: string;
		givenName?: string | null;
		familyName?: string | null;
		pronouns?: string | null;
		gender?: string | null;
		loading?: boolean;
		mode: 'drawer' | 'page';
		onClose?: () => void;
		delegationMember?: {
			id: string;
			isHeadDelegate: boolean;
			assignedCommittee?: { id: string; abbreviation: string; name: string } | null;
			delegation: {
				id: string;
				school?: string | null;
				assignedNation?: { alpha2Code: string; alpha3Code: string } | null;
				assignedNonStateActor?: { id: string; name: string; abbreviation: string } | null;
			};
		} | null;
		singleParticipant?: {
			id: string;
			applied: boolean;
			assignedRole?: { id: string; name: string; fontAwesomeIcon?: string | null } | null;
		} | null;
		conferenceSupervisor?: {
			id: string;
		} | null;
		teamMember?: {
			id: string;
			role?: string | null;
		} | null;
	}

	let {
		userId,
		conferenceId,
		givenName,
		familyName,
		pronouns,
		gender,
		loading = false,
		mode,
		onClose,
		delegationMember,
		singleParticipant,
		conferenceSupervisor,
		teamMember
	}: Props = $props();

	let displayName = $derived(
		formatNames(givenName ?? undefined, familyName ?? undefined, {
			givenNameFirst: false,
			delimiter: ', '
		})
	);

	let fullPageUrl = $derived(`/management/${conferenceId}/user/${userId}`);

	const genderIcon = $derived.by(() => {
		switch (gender) {
			case 'MALE':
				return 'mars';
			case 'FEMALE':
				return 'venus';
			case 'DIVERSE':
				return 'transgender';
			default:
				return 'genderless';
		}
	});

	const roleIcon = $derived.by(() => {
		if (delegationMember) return 'users-viewfinder';
		if (singleParticipant) return 'user';
		if (conferenceSupervisor) return 'chalkboard-user';
		if (teamMember) return 'people-group';
		return undefined;
	});

	const roleLabel = $derived.by(() => {
		if (delegationMember) return m.delegationMember();
		if (singleParticipant) return m.singleParticipant();
		if (conferenceSupervisor) return m.supervisor();
		if (teamMember) return m.teamMember();
		return undefined;
	});

	const copyUserId = async () => {
		await navigator.clipboard.writeText(userId);
		toast.success(m.codeCopied());
	};
</script>

<div class="flex items-center gap-3 px-5 pt-3 pb-2 md:px-10 lg:px-16">
	{#if loading}
		<div class="flex flex-1 flex-col gap-1">
			<div class="skeleton h-7 w-48"></div>
			<div class="skeleton h-4 w-32"></div>
		</div>
	{:else}
		<div class="flex flex-1 flex-col gap-0.5 border border-base-300 bg-base-200 rounded-box p-4">
			<h2 class="text-3xl font-bold">{displayName}</h2>

			<button
				class="text-base-content/40 hover:text-base-content/60 cursor-pointer self-start font-mono text-xs transition-colors"
				onclick={copyUserId}
				title={m.copy()}
			>
				{userId}
			</button>

			<div class="flex flex-wrap items-center gap-4">
				<i class="fa-duotone fa-{genderIcon} text-base-content/50"></i>
				{#if pronouns}
					<span class="text-base-content/60 text-sm">({pronouns})</span>
				{/if}
				{#if roleIcon && roleLabel}
					<div class="tooltip tooltip-bottom" data-tip={roleLabel}>
						<i class="fa-duotone fa-{roleIcon} text-primary"></i>
					</div>
				{/if}
			</div>

			<!-- Role summary -->
			{#if delegationMember}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
					<span class="badge badge-primary badge-sm">
						<i class="fa-duotone fa-users-viewfinder mr-1"></i>
						{m.delegationMember()}
					</span>
					{#if delegationMember.isHeadDelegate}
						<span class="badge badge-accent badge-sm">{m.headDelegate()}</span>
					{/if}
					{#if delegationMember.delegation.assignedNation}
						<span class="badge badge-ghost badge-sm gap-1">
							<span
								class="fi fi-{delegationMember.delegation.assignedNation.alpha2Code.toLowerCase()}"
							></span>
							{delegationMember.delegation.assignedNation.alpha3Code}
						</span>
					{:else if delegationMember.delegation.assignedNonStateActor}
						<span class="badge badge-ghost badge-sm">
							{delegationMember.delegation.assignedNonStateActor.abbreviation}
						</span>
					{/if}
					{#if delegationMember.assignedCommittee}
						<span class="badge badge-ghost badge-sm">
							{delegationMember.assignedCommittee.abbreviation}
						</span>
					{/if}
				</div>
			{:else if singleParticipant}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
					<span class="badge badge-primary badge-sm">
						<i class="fa-duotone fa-user mr-1"></i>
						{m.singleParticipant()}
					</span>
					{#if !singleParticipant.applied}
						<span class="badge badge-warning badge-sm">{m.notApplied()}</span>
					{/if}
					{#if singleParticipant.assignedRole}
						<span class="badge badge-ghost badge-sm gap-1">
							{#if singleParticipant.assignedRole.fontAwesomeIcon}
								<i
									class="fa-duotone fa-{singleParticipant.assignedRole.fontAwesomeIcon.replace(
										'fa-',
										''
									)}"
								></i>
							{/if}
							{singleParticipant.assignedRole.name}
						</span>
					{/if}
				</div>
			{:else if conferenceSupervisor}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
					<span class="badge badge-primary badge-sm">
						<i class="fa-duotone fa-chalkboard-user mr-1"></i>
						{m.supervisor()}
					</span>
				</div>
			{:else if teamMember}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
					<span class="badge badge-primary badge-sm">
						<i class="fa-duotone fa-people-group mr-1"></i>
						{m.teamMember()}
					</span>
					{#if teamMember.role}
						<span class="badge badge-ghost badge-sm">
							{translateTeamRole(teamMember.role)}
						</span>
					{/if}
				</div>
			{/if}
		</div>
		{#if mode === 'drawer'}
			<a
				href={fullPageUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="btn btn-ghost btn-sm btn-square"
				title={m.userCardOpenFullPage()}
			>
				<i class="fa-duotone fa-arrow-up-right-from-square"></i>
			</a>
		{/if}
	{/if}
	{#if mode === 'drawer' && onClose}
		<button class="btn btn-ghost btn-sm btn-square" onclick={onClose} aria-label="Close">
			<i class="fa-solid fa-xmark"></i>
		</button>
	{/if}
</div>
