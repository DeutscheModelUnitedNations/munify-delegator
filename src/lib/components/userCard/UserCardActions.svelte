<script lang="ts">
	import { logger } from '#lib/logger';
	import { resolve } from '$app/paths';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { toast } from 'svelte-sonner';
	import formatNames from '#lib/helpers/formatNames';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import ImpersonationButton from './ImpersonationButton.svelte';
	import Modal from '../Modal.svelte';
	import { PUBLIC_BADGE_GENERATOR_URL } from '$app/env/public';
	import { closeUserCard } from './userCardState.svelte';
	import type { UserCardRoles } from './userCardRoles';
	import {
		badgeSeatOf,
		badgeSessionBody,
		requestBadgeSession,
		seatBadgeValues
	} from './badgeSession';
	import BadgeGeneratorLinks from '../BadgeGeneratorLinks.svelte';
	import { personBadge } from '#lib/helpers/badgeCsv';

	/** What can be done with the person, whatever tab is open: badge, impersonation, the rarer ones. */
	interface Props extends UserCardRoles {
		userId: string;
		conferenceId: string;
		givenName?: string | null;
		familyName?: string | null;
		pronouns?: string | null;
		mode: 'drawer' | 'page';
		/** Opens the editor of the care team's note */
		onEditNote: () => void;
	}

	let {
		userId,
		conferenceId,
		givenName,
		familyName,
		pronouns,
		mode,
		onEditNote,
		delegationMember,
		singleParticipant,
		conferenceSupervisor,
		teamMember
	}: Props = $props();

	let confirmDisplayName = $derived(
		formatNames({ givenName: givenName ?? undefined, familyName: familyName ?? undefined })
	);

	let fullPageUrl = $derived(
		resolve('/(authenticated)/dashboard/[conferenceId]/team/user/[userId]', {
			conferenceId,
			userId
		})
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
			const [status] = await client.query.conferenceParticipants({
				__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
				id: true,
				mediaConsentStatus: true
			});
			const body = badgeSessionBody({
				givenName,
				familyName,
				...seatBadgeValues({
					member: delegationMember,
					countryName: getFullTranslatedCountryNameFromISO3Code
				}),
				pronouns,
				id: userId,
				mediaConsentStatus: status?.mediaConsentStatus
			});
			window.open(
				await requestBadgeSession({ baseUrl: PUBLIC_BADGE_GENERATOR_URL, body }),
				'_blank'
			);
		} catch (e) {
			logger.error('Failed to open badge generator', e);
			toast.error(m.genericToastError());
		}
	};

	// What the person's badge shows, if they hold anything a badge could show.
	const badgeSeat = $derived(
		badgeSeatOf({
			roles: { delegationMember, singleParticipant, conferenceSupervisor, teamMember },
			labels: {
				countryName: getFullTranslatedCountryNameFromISO3Code,
				supervisor: m.supervisor(),
				team: m.teamBadge()
			}
		})
	);

	const badgeName = $derived(
		formatNames({
			givenName: givenName ?? undefined,
			familyName: familyName ?? undefined,
			options: { familyNameUppercase: false }
		})
	);

	/** The person's nametag as the one row of a badge CSV. */
	const badgeRows = async () => {
		if (!badgeSeat) return [];
		const [status] = await client.query.conferenceParticipants({
			__args: { where: { conferenceId: { eq: conferenceId }, userId: { eq: userId } } },
			id: true,
			mediaConsentStatus: true
		});
		// The team is photographed anyway; a participant's own consent decides for them
		const mediaConsentStatus = teamMember ? 'ALLOWED_ALL' : status?.mediaConsentStatus;
		return [
			personBadge({
				person: { name: badgeName, pronouns, id: userId, mediaConsentStatus },
				seat: badgeSeat
			})
		];
	};

	let badgeModalOpen = $state(false);
	let actionsOpen = $state(false);
	let actionsMenu = $state<HTMLDetailsElement>();

	/** Runs a menu entry and closes the menu, which a `<details>` does not do on its own. */
	const menuAction = (action: () => void) => () => {
		actionsOpen = false;
		action();
	};

	const closeActionsOutside = (event: MouseEvent) => {
		if (actionsOpen && event.target instanceof Node && !actionsMenu?.contains(event.target)) {
			actionsOpen = false;
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

<!-- Pulled out by the first button's padding, so its icon lines up with the name above -->
<div class="-ml-2 flex items-center gap-1" data-tour="team.userCard.actions">
	<!-- Opened by its button only: a focus-driven dropdown also opened when focus landed in it -->
	{#if badgeSeat}
		<div class="tooltip tooltip-bottom" data-tip={m.generateBadge()}>
			<button
				class="btn btn-ghost btn-sm btn-square"
				aria-label={m.generateBadge()}
				onclick={() => (badgeModalOpen = true)}
			>
				<i aria-hidden="true" class="ph-duotone ph-identification-badge"></i>
			</button>
		</div>
	{/if}

	<ImpersonationButton {userId} iconOnly />

	<!-- The rarer actions, the destructive one last -->
	<!-- A <details> opens on click only, never because focus moved into it -->
	<details class="dropdown" bind:open={actionsOpen} bind:this={actionsMenu}>
		<summary
			class="btn btn-ghost btn-sm btn-square list-none"
			aria-label={m.userCardMoreActions()}
			title={m.userCardMoreActions()}
		>
			<i aria-hidden="true" class="ph-duotone ph-dots-three-vertical"></i>
		</summary>
		<ul
			class="dropdown-content menu bg-base-100 rounded-box border-base-300 z-20 mt-2 w-60 border p-2 shadow-lg"
		>
			<li>
				<button onclick={menuAction(onEditNote)}>
					<i aria-hidden="true" class="ph-duotone ph-note"></i>
					{m.editGlobalNotes()}
				</button>
			</li>
			<li>
				<button onclick={menuAction(copyUserId)}>
					<i aria-hidden="true" class="ph-duotone ph-copy"></i>
					{m.copyUserId()}
				</button>
			</li>
			{#if isParticipant}
				<li>
					<button
						class="text-error"
						onclick={menuAction(() => {
							deleteConfirmInput = '';
							deleteModalOpen = true;
						})}
					>
						<i aria-hidden="true" class="ph-duotone ph-user-minus"></i>
						{m.deleteParticipant()}
					</button>
				</li>
			{/if}
		</ul>
	</details>

	{#if mode === 'drawer'}
		<a
			href={fullPageUrl}
			target="_blank"
			rel="noopener noreferrer"
			class="btn btn-ghost btn-sm btn-square"
			title={m.userCardOpenFullPage()}
		>
			<i aria-hidden="true" class="ph-duotone ph-arrow-square-out"></i>
		</a>
	{/if}
</div>

<svelte:window onclick={closeActionsOutside} />

<Modal bind:open={badgeModalOpen} title={m.badgeForPerson()}>
	<div class="flex flex-col gap-2">
		{#if PUBLIC_BADGE_GENERATOR_URL}
			<button class="btn btn-sm btn-primary w-full" onclick={openBadgeGenerator}>
				<i aria-hidden="true" class="ph-duotone ph-magic-wand"></i>
				{m.badgeGeneratorPrefilled()}
			</button>
		{/if}
		<BadgeGeneratorLinks
			badges={badgeRows}
			filename="badge_{formatNames({
				givenName: givenName ?? undefined,
				familyName: familyName ?? undefined,
				options: {
					givenNameFirst: false,
					delimiter: '_'
				}
			})}"
			label={m.badgeCsvDownload()}
			showHint
		/>
	</div>
</Modal>

<!-- Delete confirmation modal -->
<Modal bind:open={deleteModalOpen} title={m.deleteParticipant()}>
	<div class="flex flex-col gap-4">
		<div class="alert alert-error">
			<i aria-hidden="true" class="ph-duotone ph-warning text-xl"></i>
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
				<i aria-hidden="true" class="ph-duotone ph-copy text-xs"></i>
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
			<i aria-hidden="true" class="ph-duotone ph-trash"></i>
			{m.deleteParticipantConfirmButton()}
		</button>
	{/snippet}
</Modal>
