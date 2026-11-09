<script lang="ts">
	import PreviousParticipations from './PreviousParticipations.svelte';
	import { genderIcon, type delegationApplication } from './sighting';
	import { openUserCard } from '#lib/components/userCard/userCardState.svelte.js';
	import { getAgeAtConference } from '#lib/helpers/ageChecker';
	import formatNames from '#lib/helpers/formatNames';
	import { careNotesOf } from '#lib/helpers/linkedNotes';
	import { m } from '#lib/paraglide/messages';

	/**
	 * One applicant as a table row: name, age at the conference, gender, earlier conferences. The
	 * name opens the person's user card drawer; a care note (what the care
	 * team keeps on people who misbehaved before) shows as a red warning.
	 */
	interface Props {
		person: ReturnType<typeof delegationApplication>['people'][number];
		startConference: Date | string;
	}

	let { person, startConference }: Props = $props();

	const note = $derived(careNotesOf(person));

	const age = $derived(
		person.birthday ? getAgeAtConference({ birthday: person.birthday, startConference }) : undefined
	);
</script>

<tr>
	<td class="font-medium">
		<button
			type="button"
			class="link link-hover cursor-pointer"
			onclick={() => openUserCard(person.id)}
		>
			{formatNames({ givenName: person.givenName, familyName: person.familyName })}
		</button>
		{#if note}
			<i
				aria-hidden="true"
				class="ph-duotone ph-warning text-error ml-1.5 text-lg"
				title={note}
				aria-label={m.globalNotes()}
			></i>
		{/if}
		{#if person.isHeadDelegate}
			<i aria-hidden="true" class="ph-duotone ph-crown text-warning ml-1" title={m.headDelegate()}
			></i>
		{/if}
	</td>
	<td class="text-right tabular-nums">{age ?? '?'}</td>
	<td class="text-center"
		><i aria-hidden="true" class="ph-duotone ph-{genderIcon(person.gender)}"></i></td
	>
	<td class="text-right tabular-nums">
		<PreviousParticipations count={person.conferenceParticipationsCount}>
			{#snippet none()}
				<span class="text-base-content/30">–</span>
			{/snippet}
		</PreviousParticipations>
	</td>
</tr>
