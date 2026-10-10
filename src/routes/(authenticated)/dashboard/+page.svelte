<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import { getOptionalCurrentUser } from '$lib/state/currentUser.svelte';
	import SignInHint from '$lib/components/dashboard/SignInHint.svelte';
	import ConferenceSelectorHeader from '$lib/components/dashboard/ConferenceSelectorHeader.svelte';
	import MyConferencesSection from '$lib/components/dashboard/MyConferencesSection.svelte';
	import ConferenceStateGroup from './ConferenceStateGroup.svelte';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import ConferenceSelectorCard from '$lib/components/dashboard/ConferenceSelectorCard.svelte';
	import { fetchMyConferenceIds, fetchSelectableConferences } from './conferenceSelector';
	import { groupConferencesByState } from './conferenceGroups';

	// Only what decides the grouping; each card fetches what it shows.
	const conferences = $derived(await fetchSelectableConferences());
	const currentUser = await getOptionalCurrentUser();

	// A visitor who is not signed in has no part in any conference yet
	const myConferenceIds = $derived(
		currentUser ? await fetchMyConferenceIds(currentUser.sub) : new Set<string>()
	);

	// "Your conferences" first: one list, ordered by conference state. Past conferences always go
	// to the regular groups below, even the ones the user took part in.
	const isMine = (conference: (typeof conferences)[number]) =>
		myConferenceIds.has(conference.id) && conference.state !== 'POST';
	const mine = $derived(
		groupConferencesByState(conferences.filter(isMine)).flatMap((group) => group.conferences)
	);
	const others = $derived(groupConferencesByState(conferences.filter((c) => !isMine(c))));
</script>

{#if conferences.length === 0}
	<div class="flex w-full flex-col items-center gap-4">
		<NoConferenceIndicator />
		{#if currentUser?.isAdmin}
			<a class="btn btn-ghost btn-sm" href={resolve('/dashboard/seed')}>
				<i class="fa-sharp-duotone fa-solid fa-seedling"></i>
				{m.seedConference()}
			</a>
		{/if}
	</div>
{:else}
	<div class="flex w-full flex-col items-center pb-16">
		<div class="flex w-full max-w-none flex-col gap-12">
			<ConferenceSelectorHeader isAdmin={currentUser?.isAdmin ?? false} />

			{#if !currentUser}
				<SignInHint title={m.yourConferences()} text={m.signInToSeeYourConferences()} />
			{:else if mine.length > 0}
				<MyConferencesSection conferenceIds={mine.map((conference) => conference.id)} />
			{/if}

			{#if others.length > 0}
				<div class="flex flex-col gap-8">
					{#each others as group (group.key)}
						<ConferenceStateGroup
							groupKey={group.key}
							conferenceIds={group.conferences.map((conference) => conference.id)}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
