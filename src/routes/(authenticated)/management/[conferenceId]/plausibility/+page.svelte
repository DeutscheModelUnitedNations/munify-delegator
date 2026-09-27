<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { error } from '@sveltejs/kit';
	import type { PageData } from './$types';
	import { client } from '$lib/api/rumbleClient/client';
	import PlausibilityDetails from './PlausibilityDetails.svelte';
	import PlausibilityOverviewItem from './PlausibilityOverviewItem.svelte';

	interface Props {
		data: PageData;
	}

	const userSummary = { id: true, givenName: true, familyName: true } as const;

	const plausibility = $derived(
		await client.liveQuery.conferencePlausibility({
			__args: { conferenceId: page.params.conferenceId! },
			dataMissing: userSummary,
			shouldBeSupervisor: userSummary,
			shouldNotBeSupervisor: userSummary,
			tooOldUsers: userSummary,
			tooYoungUsers: userSummary
		})
	);

	if (!plausibility) {
		error(404, 'Could not find plausibility data');
	}
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
		<h2 class="text-2xl font-bold">{m.plausibilityOverview()}</h2>
		<div class="w-fit">
			<table class="table">
				<thead>
					<tr>
						<th>{m.plausibilityCategory()}</th>
						<th>{m.plausibilityFinding()}</th>
						<th>{m.plausibilityCount()}</th>
					</tr>
				</thead>
				<tbody>
					<PlausibilityOverviewItem
						headline={m.plausibilityTooYoung()}
						items={plausibility.tooYoungUsers}
					/>
					<PlausibilityOverviewItem
						headline={m.plausibilityTooOld()}
						items={plausibility.tooOldUsers}
					/>
					<PlausibilityOverviewItem
						headline={m.plausibilityShouldBeSupervisor()}
						items={plausibility.shouldBeSupervisor}
					/>
					<PlausibilityOverviewItem
						headline={m.plausibilityShouldNotBeSupervisor()}
						items={plausibility.shouldNotBeSupervisor}
					/>
					<PlausibilityOverviewItem
						headline={m.plausibilityIncompleteOrInvalidData()}
						items={plausibility.dataMissing}
					/>
				</tbody>
			</table>
		</div>
	</div>
	<PlausibilityDetails
		headline={m.plausibilityTooYoung()}
		items={plausibility.tooYoungUsers}
		conferenceId={page.params.conferenceId!}
	/>
	<PlausibilityDetails
		headline={m.plausibilityTooOld()}
		items={plausibility.tooOldUsers}
		conferenceId={page.params.conferenceId!}
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldBeSupervisor()}
		items={plausibility.shouldBeSupervisor}
		conferenceId={page.params.conferenceId!}
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldNotBeSupervisor()}
		items={plausibility.shouldNotBeSupervisor}
		conferenceId={page.params.conferenceId!}
	/>
	<PlausibilityDetails
		headline={m.plausibilityIncompleteOrInvalidData()}
		items={plausibility.dataMissing}
		conferenceId={page.params.conferenceId!}
	/>
</div>
