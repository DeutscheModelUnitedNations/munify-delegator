<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import PlausibilityDetails from './PlausibilityDetails.svelte';
	import PlausibilityOverviewItem from './PlausibilityOverviewItem.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const userSummary = { id: true, givenName: true, familyName: true } as const;

	const plausibility = $derived(
		await client.liveQuery.conferencePlausibility({
			__args: { conferenceId: params.conferenceId },
			dataMissing: userSummary,
			shouldBeSupervisor: userSummary,
			shouldNotBeSupervisor: userSummary,
			tooOldUsers: userSummary,
			tooYoungUsers: userSummary
		})
	);
</script>

<div class="flex flex-col gap-8 p-10">
	<div class="flex flex-col gap-2">
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
		conferenceId={params.conferenceId}
	/>
	<PlausibilityDetails
		headline={m.plausibilityTooOld()}
		items={plausibility.tooOldUsers}
		conferenceId={params.conferenceId}
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldBeSupervisor()}
		items={plausibility.shouldBeSupervisor}
		conferenceId={params.conferenceId}
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldNotBeSupervisor()}
		items={plausibility.shouldNotBeSupervisor}
		conferenceId={params.conferenceId}
	/>
	<PlausibilityDetails
		headline={m.plausibilityIncompleteOrInvalidData()}
		items={plausibility.dataMissing}
		conferenceId={params.conferenceId}
	/>
</div>
