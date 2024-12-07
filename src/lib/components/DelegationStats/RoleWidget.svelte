<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import Wrapper from './Wrapper.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { Committee, Nation, NonStateActor } from '@prisma/client';
	import * as m from '$lib/paraglide/messages.js';

	interface Props {
		country: Nation | null | undefined;
		committees: Omit<Committee, 'conferenceId'>[] | null | undefined;
		nonStateActor: Omit<NonStateActor, 'conferenceId'> | null | undefined;
	}

	let { country, nonStateActor, committees }: Props = $props();
	$inspect(committees);
</script>

<Wrapper className="w-full">
	<div class="stat">
		<div class="stat-figure text-secondary">
			<Flag
				alpha2Code={country?.alpha2Code}
				icon={nonStateActor?.fontAwesomeIcon ?? undefined}
				nsa={!!nonStateActor}
				size="md"
			/>
		</div>
		<div class="stat-title">Sie vertreten</div>
		<div class="stat-value overflow-ellipsis text-wrap text-2xl sm:w-auto sm:text-4xl">
			{#if nonStateActor}
				{nonStateActor.name}
			{:else if country}
				{getFullTranslatedCountryNameFromISO3Code(country.alpha3Code)}
			{/if}
		</div>
		<div class="stat-desc mt-2 flex flex-col gap-1">
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
