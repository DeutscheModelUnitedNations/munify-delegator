<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { fetchMyConferences } from './myConferences.svelte';
	import { getCurrentUser } from '$lib/state/currentUser.svelte';
	import { m } from '$lib/paraglide/messages';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import DashboardSection from '$lib/components/dashboard/DashboardSection.svelte';
	import MyConferenceCard from '$lib/components/dashboard/MyConferenceCard.svelte';

	// The same list the side navigation shows; each card fetches its own details.
	const conferences = $derived(await fetchMyConferences());
	const currentUser = await getCurrentUser();

	// Someone taking part in exactly one conference has nothing to pick, so they go straight to it.
	$effect(() => {
		if (conferences.length === 1) {
			goto(resolve(`/dashboard/${conferences[0].id}`), { replaceState: true });
		}
	});

	// Sort conferences: upcoming first (by start date asc), then past conferences (by start date desc)
	const sortedConferences = $derived.by(() => {
		const now = new Date();
		const upcoming = conferences
			.filter((c) => new Date(c.startConference) >= now)
			.sort(
				(a, b) => new Date(a.startConference).getTime() - new Date(b.startConference).getTime()
			);
		const past = conferences
			.filter((c) => new Date(c.startConference) < now)
			.sort(
				(a, b) => new Date(b.startConference).getTime() - new Date(a.startConference).getTime()
			);
		return [...upcoming, ...past];
	});
</script>

{#snippet seedLink()}
	{#if currentUser.isAdmin}
		<a class="btn btn-ghost btn-sm self-center" href={resolve('/dashboard/seed')}>
			<i class="fa-duotone fa-seedling"></i>
			{m.seedConference()}
		</a>
	{/if}
{/snippet}

{#if conferences.length === 0}
	<div class="flex w-full flex-col items-center gap-4">
		<NoConferenceIndicator />
		{@render seedLink()}
	</div>
{:else}
	<div class="flex w-full flex-col items-center">
		<div class="flex w-full max-w-4xl flex-col gap-6">
			<DashboardSection
				icon="globe"
				title={currentUser.isAdmin ? m.allConferences() : m.myConferences()}
				description={currentUser.isAdmin
					? m.allConferencesDescription()
					: m.myConferencesDescription()}
			>
				<div class="flex flex-col gap-4">
					{#each sortedConferences as conference (conference.id)}
						<MyConferenceCard conferenceId={conference.id} />
					{/each}

					<!-- Register for another conference card -->
					<a
						href={resolve('/registration')}
						class="card bg-base-100 border-primary hover:bg-base-200 border-2 border-dashed transition-colors"
					>
						<div class="card-body items-center justify-center py-8">
							<i class="fa-duotone fa-plus text-primary mb-2 text-4xl"></i>
							<span class="text-primary font-medium">{m.registerForAnotherConference()}</span>
						</div>
					</a>
				</div>
			</DashboardSection>
			{@render seedLink()}
		</div>
	</div>
{/if}
