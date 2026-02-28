<script lang="ts">
	import { graphql, cache } from '$houdini';
	import { invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import formatNames from '$lib/services/formatNames';
	import { translateTeamRole } from '$lib/services/enumTranslations';
	import Flag from '../Flag.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import ImpersonationButton from '../../../routes/(authenticated)/management/[conferenceId]/participants/ImpersonationButton.svelte';
	import Modal from '../Modal.svelte';

	interface Props {
		userId: string;
		conferenceId: string;
		givenName?: string | null;
		familyName?: string | null;
		pronouns?: string | null;
		gender?: string | null;
		loading?: boolean;
		mode: 'drawer' | 'page';
		delegationMember?: {
			id: string;
			isHeadDelegate: boolean;
			assignedCommittee?: { id: string; abbreviation: string; name: string } | null;
			delegation: {
				id: string;
				school?: string | null;
				assignedNation?: { alpha2Code: string; alpha3Code: string } | null;
				assignedNonStateActor?: {
					id: string;
					name: string;
					abbreviation: string;
					faIcon: string;
				} | null;
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
		onDelete?: () => void;
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
		delegationMember,
		singleParticipant,
		conferenceSupervisor,
		teamMember,
		onDelete
	}: Props = $props();

	let displayName = $derived(
		formatNames(givenName ?? undefined, familyName ?? undefined, {
			givenNameFirst: false,
			delimiter: ', '
		})
	);

	let confirmDisplayName = $derived(formatNames(givenName ?? undefined, familyName ?? undefined));

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

	const isParticipant = $derived(
		!!delegationMember || !!singleParticipant || !!conferenceSupervisor
	);

	const copyUserId = async () => {
		await navigator.clipboard.writeText(userId);
		toast.success(m.codeCopied());
	};

	// --- Badge generation ---
	const downloadBadge = async () => {
		const badgeUrl = `/api/badge?conferenceId=${conferenceId}&userId=${userId}`;
		try {
			const response = await fetch(badgeUrl);
			if (!response.ok) {
				toast.error(m.genericToastError());
				return;
			}
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `badge-${formatNames(givenName ?? undefined, familyName ?? undefined)}.pdf`;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			toast.error(m.genericToastError());
		}
	};

	// --- Delete participant ---
	let deleteModalOpen = $state(false);
	let deleteConfirmInput = $state('');
	let deleteLoading = $state(false);

	const deleteConfirmNameMatch = $derived(
		deleteConfirmInput.trim().toLowerCase() === confirmDisplayName.trim().toLowerCase()
	);

	const deleteParticipantMutation = graphql(`
		mutation UserCardHeaderDeleteParticipant($conferenceId: ID!, $userId: ID!) {
			unregisterParticipant(conferenceId: $conferenceId, userId: $userId) {
				id
			}
		}
	`);

	const executeDelete = async () => {
		if (!deleteConfirmNameMatch) return;
		deleteLoading = true;
		try {
			await deleteParticipantMutation.mutate({ conferenceId, userId });
			cache.markStale();
			await invalidateAll();
			deleteModalOpen = false;
			toast.success(m.genericToastSuccess());
			onDelete?.();
		} catch {
			toast.error(m.httpGenericError());
		} finally {
			deleteLoading = false;
		}
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
			<div class="flex flex-wrap items-center gap-4">
				<h2 class="text-3xl font-bold">{displayName}</h2>
				<i class="fa-duotone fa-{genderIcon} text-base-content/50"></i>
				{#if pronouns}
					<span class="text-base-content/60 text-sm">({pronouns})</span>
				{/if}

				<!-- Action buttons -->
				<div class="ml-auto flex items-center gap-1">
					<div class="tooltip tooltip-bottom" data-tip={m.generateBadge()}>
						<button
							class="btn btn-ghost btn-sm btn-square"
							aria-label={m.generateBadge()}
							onclick={downloadBadge}
						>
							<i class="fa-duotone fa-id-badge"></i>
						</button>
					</div>

					<div class="tooltip tooltip-bottom" data-tip={m.impersonation()}>
						<ImpersonationButton {userId} iconOnly />
					</div>

					{#if isParticipant}
						<div class="tooltip tooltip-bottom" data-tip={m.deleteParticipant()}>
							<button
								class="btn btn-ghost btn-sm btn-square text-error"
								aria-label={m.deleteParticipant()}
								onclick={() => {
									deleteConfirmInput = '';
									deleteModalOpen = true;
								}}
							>
								<i class="fa-duotone fa-user-xmark"></i>
							</button>
						</div>
					{/if}

					{#if mode === 'drawer'}
						<div class="divider divider-horizontal mx-0"></div>
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
				</div>
			</div>

			<button
				class="text-base-content/40 hover:text-base-content/60 cursor-pointer self-start font-mono text-xs transition-colors"
				onclick={copyUserId}
				title={m.copy()}
			>
				{userId}
			</button>

			<!-- Role summary -->
			{#if delegationMember}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
					{#if delegationMember.delegation.assignedNation || delegationMember.delegation.assignedNonStateActor}
						<div
							class="tooltip tooltip-bottom"
							data-tip={delegationMember.delegation.assignedNonStateActor?.name ??
								(delegationMember.delegation.assignedNation &&
									getFullTranslatedCountryNameFromISO3Code(
										delegationMember.delegation.assignedNation.alpha3Code
									))}
						>
							<Flag
								size="xs"
								alpha2Code={delegationMember?.delegation.assignedNation?.alpha2Code}
								nsa={!!delegationMember?.delegation.assignedNonStateActor}
								icon={delegationMember?.delegation.assignedNonStateActor?.faIcon}
							/>
						</div>
					{:else}
						<span class="badge badge-error badge-soft">{m.noAssignment()}</span>
					{/if}
					{#if delegationMember.assignedCommittee}
						<span class="badge badge-soft">
							{delegationMember.assignedCommittee.abbreviation}
						</span>
					{/if}
					{#if delegationMember.isHeadDelegate}
						<span class="badge badge-accent tooltip tooltip-bottom" data-tip={m.headDelegate()}
							><i class="fa-solid fa-medal"></i></span
						>
					{/if}
				</div>
			{:else if singleParticipant}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
					<span class="badge badge-primary">
						<i class="fa-duotone fa-user mr-1"></i>
						{m.singleParticipant()}
					</span>
					{#if !singleParticipant.applied}
						<span class="badge badge-warning">{m.notApplied()}</span>
					{/if}
					{#if singleParticipant.assignedRole}
						<span class="badge badge-ghost gap-1">
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
					<span class="badge badge-primary">
						<i class="fa-duotone fa-chalkboard-user mr-1"></i>
						{m.supervisor()}
					</span>
				</div>
			{:else if teamMember}
				<div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
					<span class="badge badge-primary">
						<i class="fa-duotone fa-people-group mr-1"></i>
						{m.teamMember()}
					</span>
					{#if teamMember.role}
						<span class="badge badge-ghost">
							{translateTeamRole(teamMember.role)}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Delete confirmation modal -->
<Modal bind:open={deleteModalOpen} title={m.deleteParticipant()}>
	<div class="flex flex-col gap-4">
		<div class="alert alert-error">
			<i class="fa-solid fa-triangle-exclamation text-xl"></i>
			<span>{m.deleteParticipantWarning()}</span>
		</div>

		<p class="text-sm">
			{m.typeNameToConfirmDeletion()}
			<button
				class="font-semibold hover:underline cursor-pointer"
				onclick={async () => {
					await navigator.clipboard.writeText(confirmDisplayName);
					toast.success(m.codeCopied());
				}}
				title={m.copy()}
			>
				{confirmDisplayName}
				<i class="fa-duotone fa-copy text-xs"></i>
			</button>
		</p>

		<input
			type="text"
			class="input input-bordered w-full"
			placeholder={confirmDisplayName}
			bind:value={deleteConfirmInput}
		/>
	</div>

	{#snippet action()}
		<button class="btn btn-ghost" onclick={() => (deleteModalOpen = false)}>
			{m.cancel()}
		</button>
		<button
			class="btn btn-error"
			disabled={!deleteConfirmNameMatch || deleteLoading}
			onclick={executeDelete}
		>
			{#if deleteLoading}
				<span class="loading loading-spinner loading-sm"></span>
			{/if}
			<i class="fa-solid fa-trash"></i>
			{m.deleteParticipantConfirmButton()}
		</button>
	{/snippet}
</Modal>
