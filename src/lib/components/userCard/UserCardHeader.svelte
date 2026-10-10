<script lang="ts">
	import { resolve } from '$app/paths';
	import { client } from '$lib/api/rumbleClient/client';
	import { m } from '$lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import formatNames from '$lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import UserCardStatusStrip from './UserCardStatusStrip.svelte';
	import UserCardRoleSummary from './UserCardRoleSummary.svelte';
	import PossibleDuplicateBadge from './PossibleDuplicateBadge.svelte';
	import LinkedAccountNotes from './LinkedAccountNotes.svelte';
	import ImpersonationButton from './ImpersonationButton.svelte';
	import { IMPERSONATION_ENABLED } from '$lib/data/impersonation';
	import Modal from '../Modal.svelte';
	import { configPublic } from '$config/public';
	import { closeUserCard } from './userCardState.svelte';
	import type { UserCardRoles } from './userCardRoles';
	import { badgeSessionBody, requestBadgeSession, seatBadgeValues } from './badgeSession';

	interface Props extends UserCardRoles {
		userId: string;
		conferenceId: string;
		givenName?: string | null;
		familyName?: string | null;
		pronouns?: string | null;
		gender?: string | null;
		mode: 'drawer' | 'page';
		/** Whether the person has a place in the conference, which the status strip needs */
		showStatus: boolean;
	}

	let {
		userId,
		conferenceId,
		givenName,
		familyName,
		pronouns,
		gender,
		mode,
		showStatus,
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

	const initials = $derived(
		[givenName, familyName]
			.map((name) => name?.trim().at(0))
			.filter(Boolean)
			.join('')
			.toUpperCase()
	);

	const isParticipant = $derived(
		!!delegationMember || !!singleParticipant || !!conferenceSupervisor
	);

	const copyUserId = async () => {
		await navigator.clipboard.writeText(userId);
		toast.success(m.codeCopied());
	};

	// --- Badge generation ---
	const openBadgeGenerator = async () => {
		try {
			// Only the badge needs it, so it is read when a badge is asked for.
			const [status] = await client.query.conferenceParticipantStatuses({
				__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
				id: true,
				mediaConsentStatus: true
			});
			const body = badgeSessionBody({
				givenName,
				familyName,
				...seatBadgeValues(delegationMember, getFullTranslatedCountryNameFromISO3Code),
				pronouns,
				id: userId,
				mediaConsentStatus: status?.mediaConsentStatus
			});
			window.open(
				await requestBadgeSession(configPublic.PUBLIC_BADGE_GENERATOR_URL, body),
				'_blank'
			);
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
	<div
		class="border-base-300 from-primary/10 to-base-200 rounded-box flex flex-1 flex-col gap-3 border bg-linear-to-br p-4"
	>
		<div class="flex items-start gap-4">
			<!-- Initials, so a card is recognisable at a glance -->
			<div class="avatar avatar-placeholder hidden sm:flex">
				<div class="bg-primary/20 text-primary w-14 rounded-full text-xl font-bold">
					<span>{initials}</span>
				</div>
			</div>

			<div class="flex min-w-0 flex-1 flex-col gap-0.5">
				<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
					<h2 class="text-3xl font-bold">{displayName}</h2>
					<i class="fa-sharp-duotone fa-solid fa-{genderIcon} text-base-content/50"></i>
					{#if pronouns}
						<span class="text-base-content/60 text-sm">({pronouns})</span>
					{/if}
					<PossibleDuplicateBadge {userId} {conferenceId} />
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
			</div>

			<!-- Action buttons -->
			<div class="flex items-center gap-1">
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

		<!-- Role summary -->
		<UserCardRoleSummary
			{delegationMember}
			{singleParticipant}
			{conferenceSupervisor}
			{teamMember}
		/>

		{#if showStatus}
			<UserCardStatusStrip {userId} {conferenceId} />
		{/if}

		<LinkedAccountNotes {userId} />
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
