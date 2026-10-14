<script lang="ts">
	import {
		conferenceGroupIcon,
		conferenceGroupLabel,
		type ConferenceGroupKey
	} from './conferenceGroups';
	import ConferenceSelectorCard from '$lib/components/dashboard/ConferenceSelectorCard.svelte';

	interface Props {
		groupKey: ConferenceGroupKey;
		conferenceIds: string[];
	}

	let { groupKey, conferenceIds }: Props = $props();

	const past = $derived(groupKey === 'past');
</script>

<section class="flex flex-col gap-5">
	<div class="flex items-center gap-3">
		<h3
			class="text-sm font-semibold tracking-widest uppercase {past
				? 'text-base-content/50'
				: 'text-base-content/80'}"
		>
			<i class="{conferenceGroupIcon(groupKey)} mr-1.5"></i>
			{conferenceGroupLabel(groupKey)}
		</h3>
		<span class="badge badge-ghost badge-sm">{conferenceIds.length}</span>
		<div class="bg-base-300 h-px flex-1"></div>
	</div>
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each conferenceIds as conferenceId (conferenceId)}
			<ConferenceSelectorCard {conferenceId} muted={past} />
		{/each}
	</div>
</section>
