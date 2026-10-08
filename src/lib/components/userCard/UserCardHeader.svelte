<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import formatNames from '$lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import UserCardRoleSummary from './UserCardRoleSummary.svelte';
	import PossibleDuplicateBadge from './PossibleDuplicateBadge.svelte';
	import ImpersonationButton from './ImpersonationButton.svelte';
	import { IMPERSONATION_ENABLED } from '$lib/data/impersonation';
	import Modal from '../Modal.svelte';
	import { configPublic } from '$config/public';
	import { closeUserCard } from './userCardState.svelte';
	import type { UserCardRoles } from './userCardRoles';

	interface Props extends UserCardRoles {
		userId: string;
		conferenceId: string;
		givenName?: string | null;
		familyName?: string | null;
		pronouns?: string | null;
		gender?: string | null;
		mode: 'drawer' | 'page';
	}

	let {
		userId,
		conferenceId,
		givenName,
		familyName,
		pronouns,
		gender,
		mode,
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

	let confirmDisplayName = $derived(formatNames(givenName ?? undefined, familyName ?? undefined));

	let fullPageUrl = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/management/user/[userId]', {
			conferenceId,
			userId
		})
	);

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
	const openBadgeGenerator = async () => {
		const body: {
			name?: string;
			countryName?: string;
			countryAlpha2Code?: string;
			committee?: string;
			pronouns?: string;
			id?: string;
			mediaConsentStatus?: string;
		} = {};
		if (givenName && familyName) {
			body.name = `${givenName} ${familyName}`;
		}
		if (delegationMember?.delegation.assignedNation?.alpha3Code) {
			body.countryName = getFullTranslatedCountryNameFromISO3Code(
				delegationMember.delegation.assignedNation.alpha3Code
			);
		}
		if (delegationMember?.delegation.assignedNation?.alpha2Code) {
			body.countryAlpha2Code = delegationMember.delegation.assignedNation.alpha2Code;
		}
		if (delegationMember?.assignedCommittee?.abbreviation) {
			body.committee = delegationMember.assignedCommittee.abbreviation;
		}
		if (pronouns) {
			body.pronouns = pronouns;
		}
		if (userId) {
			body.id = userId;
		}
		try {
			// Only the badge needs it, so it is read when a badge is asked for.
			const [status] = await client.query.conferenceParticipantStatuses({
				__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
				id: true,
				mediaConsentStatus: true
			});
			if (status?.mediaConsentStatus) {
				body.mediaConsentStatus = status.mediaConsentStatus;
			}
			const res = await fetch(`${configPublic.PUBLIC_BADGE_GENERATOR_URL}/api/session/create`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const errorText = await res.text();
				console.error(`Badge generator API error (${res.status}): ${errorText}`);
				toast.error(m.genericToastError());
				return;
			}
			const data: unknown = await res.json();
			if (
				typeof data !== 'object' ||
				data === null ||
				!('url' in data) ||
				typeof (data as { url: unknown }).url !== 'string' ||
				(data as { url: string }).url.trim() === ''
			) {
				console.error('Badge generator returned invalid response:', data);
				toast.error(m.genericToastError());
				return;
			}
			const { url } = data as { url: string };
			window.open(url.replace('http://', 'https://'), '_blank');
		} catch (e) {
			console.error('Failed to open badge generator', e);
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

	const executeDelete = async () => {
		if (!deleteConfirmNameMatch) return;
		deleteLoading = true;
		try {
			await client.mutate.unregisterParticipant({
				__args: { conferenceId, userId },
				id: true
			});
			deleteModalOpen = false;
			toast.success(m.genericToastSuccess());
			closeUserCard();
		} catch {
			toast.error(m.httpGenericError());
		} finally {
			deleteLoading = false;
		}
	};
</script>

<div class="flex items-center gap-3 px-5 pt-3 pb-2 md:px-10 lg:px-16">
	<div class="flex flex-1 flex-col gap-0.5 border border-base-300 bg-base-200 rounded-box p-4">
		<div class="flex flex-wrap items-center gap-4">
			<h2 class="text-3xl font-bold">{displayName}</h2>
			<i class="fa-sharp-duotone fa-solid fa-{genderIcon} text-base-content/50"></i>
			{#if pronouns}
				<span class="text-base-content/60 text-sm">({pronouns})</span>
			{/if}
			<PossibleDuplicateBadge {userId} {conferenceId} />

			<!-- Action buttons -->
			<div class="ml-auto flex items-center gap-1">
				{#if configPublic.PUBLIC_BADGE_GENERATOR_URL}
					<div class="tooltip tooltip-bottom" data-tip={m.generateBadge()}>
						<button
							class="btn btn-ghost btn-sm btn-square"
							aria-label={m.generateBadge()}
							onclick={openBadgeGenerator}
						>
							<i class="fa-sharp-duotone fa-solid fa-id-badge"></i>
						</button>
					</div>
				{/if}

				{#if IMPERSONATION_ENABLED}
					<div class="tooltip tooltip-bottom" data-tip={m.impersonation()}>
						<ImpersonationButton {userId} iconOnly />
					</div>
				{/if}

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
							<i class="fa-sharp-duotone fa-solid fa-user-xmark"></i>
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
						<i class="fa-sharp-duotone fa-solid fa-arrow-up-right-from-square"></i>
					</a>
				{/if}
			</div>
		</div>

		<button
			class="group text-base-content/40 hover:text-base-content/60 cursor-pointer self-start font-mono text-xs transition-colors"
			onclick={copyUserId}
			title={m.copy()}
		>
			<span class="group-hover:hidden">{userId}</span>
			<span class="hidden items-center gap-1 group-hover:flex">
				<i class="fa-sharp-duotone fa-solid fa-copy"></i>
				{m.copyUserId()}
			</span>
		</button>

		<!-- Role summary -->
		<UserCardRoleSummary
			{delegationMember}
			{singleParticipant}
			{conferenceSupervisor}
			{teamMember}
		/>
	</div>
</div>

<!-- Delete confirmation modal -->
<Modal bind:open={deleteModalOpen} title={m.deleteParticipant()}>
	<div class="flex flex-col gap-4">
		<div class="alert alert-error">
			<i class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-xl"></i>
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
				<i class="fa-sharp-duotone fa-solid fa-copy text-xs"></i>
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
			<i class="fa-sharp-duotone fa-solid fa-trash"></i>
			{m.deleteParticipantConfirmButton()}
		</button>
	{/snippet}
</Modal>
