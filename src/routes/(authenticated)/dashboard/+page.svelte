<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import AccentStripe from '$lib/components/AccentStripe.svelte';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import ConferenceSelectorCard from '$lib/components/dashboard/ConferenceSelectorCard.svelte';
	import { fetchSelectableConferences } from './conferenceSelector';
	import { conferenceGroupLabel, groupConferencesByState } from './conferenceGroups';

	// Only what decides the grouping; each card fetches what it shows.
	const conferences = $derived(await fetchSelectableConferences());
	const currentUser = await getCurrentUser();

	const groups = $derived(groupConferencesByState(conferences));
</script>

{#if conferences.length === 0}
	<div class="flex w-full flex-col items-center gap-4">
		<NoConferenceIndicator />
		{#if currentUser.isAdmin}
			<a class="btn btn-ghost btn-sm" href={resolve('/dashboard/seed')}>
				<i class="fa-duotone fa-seedling"></i>
				{m.seedConference()}
			</a>
		{/if}
	</div>
{:else}
	<div class="flex w-full flex-col items-center pb-16">
		<div class="flex w-full max-w-none flex-col gap-12">
			<header class="flex flex-col gap-4 pt-6">
				<AccentStripe />
				<h1 class="text-4xl font-bold tracking-tight">{m.conferences()}</h1>
				<p class="text-base-content/70 max-w-xl">{m.conferenceSelectorIntro()}</p>
			</header>

			{#each groups as group (group.key)}
				{@const past = group.key === 'past'}
				<section class="flex flex-col gap-5">
					<div class="flex items-center gap-3">
						<h2
							class="text-sm font-semibold tracking-widest uppercase {past
								? 'text-base-content/50'
								: 'text-base-content/80'}"
						>
							{conferenceGroupLabel(group.key)}
						</h2>
						<span class="badge badge-ghost badge-sm">{group.conferences.length}</span>
						<div class="bg-base-300 h-px flex-1"></div>
					</div>
					<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{#each group.conferences as conference (conference.id)}
							<ConferenceSelectorCard conferenceId={conference.id} muted={past} />
						{/each}
					</div>
				</section>
			{/each}

			{#if currentUser.isAdmin}
				<a class="btn btn-ghost btn-sm self-center" href={resolve('/dashboard/seed')}>
					<i class="fa-duotone fa-seedling"></i>
					{m.seedConference()}
				</a>
			{/if}
		</div>
	</div>
{/if}
