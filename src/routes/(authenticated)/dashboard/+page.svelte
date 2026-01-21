<script lang="ts">
	import type { PageData } from './$types';
	import { m } from '$lib/paraglide/messages';
	import NoConferenceIndicator from '$lib/components/NoConferenceIndicator.svelte';
	import DashboardSection from '$lib/components/Dashboard/DashboardSection.svelte';
	import MyConferenceCard from '$lib/components/Dashboard/MyConferenceCard.svelte';

	let { data }: { data: PageData } = $props();

	// Sort conferences: upcoming first (by start date asc), then past conferences (by start date desc)
	const sortedConferences = $derived.by(() => {
		const now = new Date();
		const upcoming = data.conferences
			.filter((c) => new Date(c.startConference) >= now)
			.sort(
				(a, b) => new Date(a.startConference).getTime() - new Date(b.startConference).getTime()
			);
		const past = data.conferences
			.filter((c) => new Date(c.startConference) < now)
			.sort(
				(a, b) => new Date(b.startConference).getTime() - new Date(a.startConference).getTime()
			);
		return [...upcoming, ...past];
	});
</script>

{#if data.conferences.length === 0}
	<NoConferenceIndicator />
{:else}
	<div class="flex w-full flex-col items-center">
		<div class="flex w-full max-w-4xl flex-col gap-6">
			<DashboardSection
				icon="globe"
				title={m.myConferences()}
				description={m.myConferencesDescription()}
			>
				<div class="flex flex-col gap-4">
					{#each sortedConferences as conference (conference.id)}
						<MyConferenceCard {conference} />
					{/each}

					<!-- Register for another conference card -->
					<a
						href="/registration"
						class="card bg-base-100 border-primary hover:bg-base-200 border-2 border-dashed transition-colors"
					>
						<div class="card-body items-center justify-center py-8">
							<i class="fa-duotone fa-plus text-primary mb-2 text-4xl"></i>
							<span class="text-primary font-medium">{m.registerForAnotherConference()}</span>
						</div>
					</a>
				</div>
			</DashboardSection>
		</div>
	</div>
{/if}
