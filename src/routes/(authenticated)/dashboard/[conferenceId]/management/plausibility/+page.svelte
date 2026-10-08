<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import { client } from '$lib/api/rumbleClient/client';
	import PlausibilityDetails from './PlausibilityDetails.svelte';
	import PlausibilityOverviewItem from './PlausibilityOverviewItem.svelte';
	import PossibleDuplicates from './PossibleDuplicates.svelte';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
	const conferenceId = $derived(params.conferenceId);

	const userSummary = { id: true, givenName: true, familyName: true } as const;

	const [plausibility, duplicates] = $derived(
		await Promise.all([
			client.liveQuery.conferencePlausibility({
				__args: { conferenceId },
				dataMissing: userSummary,
				shouldBeSupervisor: userSummary,
				shouldNotBeSupervisor: userSummary,
				tooOldUsers: userSummary,
				tooYoungUsers: userSummary
			}),
			client.liveQuery.conferencePossibleDuplicates({
				__args: { conferenceId },
				id: true,
				status: true
			})
		])
	);
	const openDuplicates = $derived(duplicates.filter((pair) => pair.status === 'OPEN'));
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
					<PlausibilityOverviewItem
						headline={m.plausibilityPossibleDuplicates()}
						items={openDuplicates}
					/>
				</tbody>
			</table>
		</div>
	</div>
	<PlausibilityDetails headline={m.plausibilityTooYoung()} items={plausibility.tooYoungUsers} />
	<PlausibilityDetails headline={m.plausibilityTooOld()} items={plausibility.tooOldUsers} />
	<PlausibilityDetails
		headline={m.plausibilityShouldBeSupervisor()}
		items={plausibility.shouldBeSupervisor}
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldNotBeSupervisor()}
		items={plausibility.shouldNotBeSupervisor}
	/>
	<PlausibilityDetails
		headline={m.plausibilityIncompleteOrInvalidData()}
		items={plausibility.dataMissing}
	/>
	<PossibleDuplicates {conferenceId} />
</div>
