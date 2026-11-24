<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import formatNames from '#lib/helpers/formatNames';
	import LoadError from '#lib/components/LoadError.svelte';
	import AgeBadge from './sidebar/AgeBadge.svelte';
	import OpenFormalities from './sidebar/OpenFormalities.svelte';
	import PersonFacts from './sidebar/PersonFacts.svelte';
	import UserCardActions from './UserCardActions.svelte';
	import UserCardRoleSummary from './UserCardRoleSummary.svelte';
	import PossibleDuplicateBadge from './PossibleDuplicateBadge.svelte';
	import CareNotes from './CareNotes.svelte';
	import { genderIcon, STAGES } from './stages';
	import type { ParticipationStage, UserCardRoles } from './userCardRoles';
	import type { UserCardTab } from './userCardTabs';

	/**
	 * Who the person is and what the team looks up most, beside the tabs whichever is open: name,
	 * age, part in the conference, open formalities, notes, contact and personal details.
	 */
	interface Props extends UserCardRoles {
		userId: string;
		conferenceId: string;
		givenName?: string | null;
		familyName?: string | null;
		pronouns?: string | null;
		gender?: string | null;
		mode: 'drawer' | 'page';
		/** How far the person has come in the conference, if they apply for a seat */
		stage: ParticipationStage | undefined;
		/** The person has a `conferenceParticipant` row */
		participant: boolean;
		/** The reader sees everything, so what is empty is missing (`readsWholePerson`) */
		wholePerson: boolean;
		/** A confirmed place at the conference, from which on the formalities are due */
		access: boolean;
		shownTab: UserCardTab;
		onOpenTab: (tab: UserCardTab) => void;
		class?: string;
	}

	let {
		userId,
		conferenceId,
		givenName,
		familyName,
		pronouns,
		gender,
		mode,
		stage,
		participant,
		wholePerson,
		access,
		shownTab,
		onOpenTab,
		class: className = '',
		...roles
	}: Props = $props();

	const displayName = $derived(
		formatNames({
			givenName: givenName ?? undefined,
			familyName: familyName ?? undefined,
			options: { givenNameFirst: false, delimiter: ', ' }
		})
	);

	let careNoteOpen = $state(false);
</script>

<aside class="bg-base-200 flex flex-col gap-3 p-4 {className}" aria-label={m.userCardTabPerson()}>
	<div class="flex flex-col gap-2" data-tour="team.userCard.header">
		<!-- Clear of the drawer's close button, which a phone puts over the card -->
		<h2 class="text-2xl font-bold wrap-anywhere {mode === 'drawer' ? 'max-lg:pr-10' : ''}">
			{displayName}
		</h2>
		<div class="flex flex-wrap items-center gap-2">
			<i aria-hidden="true" class="ph-duotone ph-{genderIcon(gender)} text-base-content/50"></i>
			{#if pronouns}
				<span class="text-base-content/60 text-sm">({pronouns})</span>
			{/if}
			<AgeBadge {userId} {conferenceId} />
			{#if stage}
				{@const shown = STAGES[stage]}
				<span class="badge badge-soft badge-sm gap-1.5 {shown.badge}">
					<i aria-hidden="true" class="ph-duotone {shown.icon} text-xs"></i>
					{shown.label()}
				</span>
			{/if}
			<PossibleDuplicateBadge {userId} {conferenceId} />
		</div>
		<UserCardRoleSummary {...roles} />
	</div>

	<UserCardActions
		{userId}
		{conferenceId}
		{givenName}
		{familyName}
		{pronouns}
		{mode}
		onEditNote={() => (careNoteOpen = true)}
		{...roles}
	/>

	<CareNotes {userId} bind:editing={careNoteOpen} />

	{#if access}
		<div class="border-base-content/10 border-t pt-3 empty:hidden">
			<OpenFormalities
				{userId}
				{conferenceId}
				isConferenceSupervisor={!!roles.conferenceSupervisor}
				onOpenTab={() => onOpenTab('formalities')}
			/>
		</div>
	{/if}

	<div
		class="border-base-content/10 flex flex-col gap-3 border-t pt-3"
		data-tour="team.userCard.facts"
	>
		<svelte:boundary>
			<PersonFacts
				{userId}
				{conferenceId}
				{wholePerson}
				student={!!roles.delegationMember || !!roles.singleParticipant}
				{participant}
			/>
			{#snippet failed(_error, reset)}
				<LoadError onretry={reset} />
			{/snippet}
		</svelte:boundary>
		<button
			type="button"
			class="btn btn-sm self-start {shownTab === 'person' ? 'btn-active' : ''}"
			aria-pressed={shownTab === 'person'}
			onclick={() => onOpenTab('person')}
		>
			<i aria-hidden="true" class="ph-duotone ph-identification-card"></i>
			{m.userCardAllDetails()}
		</button>
	</div>
</aside>
