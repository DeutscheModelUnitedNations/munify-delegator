<script lang="ts">
	import { genderIcon, type delegationApplication } from '$lib/assignment/sighting';
	import { openUserCard } from '$lib/components/userCard/userCardState.svelte';
	import { getAgeAtConference } from '$lib/helpers/ageChecker';
	import formatNames from '$lib/helpers/formatNames';
	import { m } from '$lib/paraglide/messages';

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

	const note = $derived(person.globalNotes?.trim());

	const age = $derived(
		person.birthday ? getAgeAtConference(person.birthday, startConference) : undefined
	);
</script>

<tr>
	<td class="font-medium">
		<button
			type="button"
			class="link link-hover cursor-pointer"
			onclick={() => openUserCard(person.id)}
		>
			{formatNames(person.givenName, person.familyName)}
		</button>
		{#if note}
			<i
				class="fa-sharp-duotone fa-solid fa-triangle-exclamation text-error ml-1.5 text-lg"
				title={note}
				aria-label={m.globalNotes()}
			></i>
		{/if}
		{#if person.isHeadDelegate}
			<i class="fa-sharp-duotone fa-solid fa-crown text-warning ml-1" title={m.headDelegate()}></i>
		{/if}
	</td>
	<td class="text-right tabular-nums">{age ?? '?'}</td>
	<td class="text-center"
		><i class="fa-sharp-duotone fa-solid fa-{genderIcon(person.gender)}"></i></td
	>
	<td class="text-right tabular-nums">
		{#if person.conferenceParticipationsCount > 0}
			<span class="text-warning" title={m.assignmentPreviousParticipations()}>
				<i class="fa-sharp-duotone fa-solid fa-rotate-left"></i>
				{person.conferenceParticipationsCount}
			</span>
		{:else}
			<span class="text-base-content/30">–</span>
		{/if}
	</td>
</tr>
