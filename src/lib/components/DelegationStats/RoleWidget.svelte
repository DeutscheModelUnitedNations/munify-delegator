<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import Wrapper from './Wrapper.svelte';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import type { Nation, NonStateActor } from '@prisma/client';

	interface Props {
		country: Nation | null | undefined;
		nonStateActor: Omit<NonStateActor, 'conferenceId'> | null | undefined;
	}

	let { country, nonStateActor }: Props = $props();
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
	</div>
</Wrapper>
