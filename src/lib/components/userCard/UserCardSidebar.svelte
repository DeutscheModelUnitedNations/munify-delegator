<script lang="ts">
	import type { Snippet } from 'svelte';
	import { m } from '#lib/paraglide/messages';
	import { translateTeamRole } from '#lib/utils/enumTranslations';
	import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
	import formatNames from '#lib/helpers/formatNames';
	import OpenFormalities from './sidebar/OpenFormalities.svelte';
	import UserCardActions from './UserCardActions.svelte';
	import SeatEmblemMark from './SeatEmblem.svelte';
	import { seatEmblem } from './seatEmblem';
	import PossibleDuplicateBadge from './PossibleDuplicateBadge.svelte';
	import CareNotes from './CareNotes.svelte';
	import { STAGES } from './stages';
	import type { ParticipationStage, UserCardRoles } from './userCardRoles';

	/**
	 * Who the person is, whichever tab is open: name, part in the conference, notes and what is open,
	 * and in the side column of a wide card their details.
	 */
	interface Props extends UserCardRoles {
		userId: string;
		conferenceId: string;
		givenName?: string | null;
		familyName?: string | null;
		pronouns?: string | null;
		mode: 'drawer' | 'page';
		/** How far the person has come in the conference, while they have no seat */
		stage: ParticipationStage | undefined;
		/** A confirmed place at the conference, from which on the formalities are due */
		access: boolean;
		onOpenFormalities: () => void;
		class?: string;
		/** The person's details, where there is room for them beside the tabs */
		facts?: Snippet;
	}

	let {
		userId,
		conferenceId,
		givenName,
		familyName,
		pronouns,
		mode,
		stage,
		access,
		onOpenFormalities,
		class: className = '',
		facts,
		...roles
	}: Props = $props();

	const displayName = $derived(
		formatNames({
			givenName: givenName ?? undefined,
			familyName: familyName ?? undefined,
			options: { givenNameFirst: false, delimiter: ', ' }
		})
	);

	const emblem = $derived(
		seatEmblem({
			parts: roles,
			labels: {
				countryName: getFullTranslatedCountryNameFromISO3Code,
				teamRole: translateTeamRole,
				delegationMember: m.delegationMember(),
				singleParticipant: m.singleParticipant(),
				supervisor: m.supervisor(),
				teamMember: m.teamMember()
			}
		})
	);

	let careNoteOpen = $state(false);
</script>

<aside
	class="border-base-content/10 from-primary/20 relative via-base-200 to-base-200 flex flex-col gap-3 border-r bg-linear-to-b p-4 {className}"
	aria-label={m.userCardTabPerson()}
>
	<!-- No z-index, which would trap the dialogs opened from the menu. In the corner; on a small screen the drawer's own buttons are there, so beside them -->
	<div class="absolute top-3 right-2 {mode === 'drawer' ? 'max-lg:top-4 max-lg:right-24' : ''}">
		<UserCardActions
			{userId}
			{conferenceId}
			{givenName}
			{familyName}
			{pronouns}
			onEditNote={() => (careNoteOpen = true)}
			{...roles}
		/>
	</div>

	<div class="flex flex-col gap-3" data-tour="team.userCard.header">
		<!-- Clear of the drawer's close button, which a phone puts over the card -->
		<div class="flex items-center gap-4 {mode === 'drawer' ? 'max-lg:pr-28' : ''}">
			{#if emblem}
				<SeatEmblemMark {emblem} />
			{/if}
			<div class="min-w-0 flex-1">
				<h2
					class="text-xl leading-tight font-bold wrap-anywhere sm:text-2xl {mode === 'drawer'
						? 'lg:pr-6'
						: 'pr-6'}"
				>
					{displayName}
				</h2>
				{#if emblem?.line}
					<p class="text-sm">{emblem.line}</p>
				{/if}
				<p class="text-base-content/70 flex flex-wrap gap-x-3 text-sm empty:hidden">
					{#if pronouns}
						<span>{pronouns}</span>
					{/if}
					{#if emblem?.headDelegate}
						<span>
							<i aria-hidden="true" class="ph-fill ph-medal text-accent"></i>
							{m.headDelegate()}
						</span>
					{/if}
				</p>
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-x-4 gap-y-1 empty:hidden">
			{#if stage}
				{@const shown = STAGES[stage]}
				<span class="text-base-content/70 flex items-center gap-1.5 text-sm">
					<i aria-hidden="true" class="ph-duotone {shown.icon} {shown.color}"></i>
					{shown.label()}
				</span>
			{/if}
			<PossibleDuplicateBadge {userId} {conferenceId} />
		</div>
	</div>

	<CareNotes {userId} bind:editing={careNoteOpen} />

	{#if access}
		<OpenFormalities
			{userId}
			{conferenceId}
			isConferenceSupervisor={!!roles.conferenceSupervisor}
			onOpenTab={onOpenFormalities}
		/>
	{/if}

	{@render facts?.()}
</aside>
