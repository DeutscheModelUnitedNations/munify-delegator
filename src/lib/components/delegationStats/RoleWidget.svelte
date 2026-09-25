<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import Wrapper from './Wrapper.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { MyConferenceParticipation } from '$lib/api/myConferenceParticipation';

	interface Props {
		country?: NonNullable<
			MyConferenceParticipation['delegationMember']
		>['delegation']['assignedNation'];
		committees?: NonNullable<MyConferenceParticipation['conference']>['committees'] | null;
		nonStateActor?: NonNullable<
			MyConferenceParticipation['delegationMember']
		>['delegation']['assignedNonStateActor'];
		customConferenceRole?: NonNullable<
			MyConferenceParticipation['singleParticipant']
		>['assignedRole'];
	}

	let { country, nonStateActor, committees, customConferenceRole }: Props = $props();
</script>

<Wrapper className="w-full">
	<div class="stat">
		<div class="stat-figure text-secondary">
			<Flag
				alpha2Code={country?.alpha2Code}
				icon={nonStateActor?.fontAwesomeIcon ?? customConferenceRole?.fontAwesomeIcon ?? 'globe'}
				nsa={!!nonStateActor || !!customConferenceRole}
				size="md"
			/>
		</div>
		<div class="stat-title">{m.youWillRepresent()}</div>
		<div class="stat-value text-2xl text-wrap overflow-ellipsis sm:w-auto sm:text-4xl">
			{#if nonStateActor}
				{nonStateActor.name}
			{:else if country}
				{getFullTranslatedCountryNameFromISO3Code(country.alpha3Code)}
			{:else if customConferenceRole}
				{customConferenceRole.name}
			{/if}
		</div>
		<div class="stat-desc mt-2 flex flex-wrap gap-1">
			{#if committees && committees.length > 0}
				{#each committees as committee}
					<div class="badge">
						{committee.name}{committee.numOfSeatsPerDelegation !== 1
							? ` (${committee.numOfSeatsPerDelegation}x)`
							: ''}
					</div>
				{/each}
			{:else if nonStateActor}
				<div class="badge">{nonStateActor.seatAmount} {m.seats()}</div>
			{/if}
		</div>
	</div>
</Wrapper>
