<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { error } from '@sveltejs/kit';
	import type { PageData } from './$houdini';
	import PlausibilityDetails from './PlausibilityDetails.svelte';
	import PlausibilityOverviewItem from './PlausibilityOverviewItem.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let plausibilityQuery = $derived(data.PlausibilityQuery);
	let plausibility = $derived($plausibilityQuery.data?.conferencePlausibility);

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
		link="/management/{data.conferenceId}/participants?filter="
	/>
	<PlausibilityDetails
		headline={m.plausibilityTooOld()}
		items={plausibility.tooOldUsers}
		link="/management/{data.conferenceId}/participants?filter="
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldBeSupervisor()}
		items={plausibility.shouldBeSupervisor}
		link="/management/{data.conferenceId}/participants?filter="
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldNotBeSupervisor()}
		items={plausibility.shouldNotBeSupervisor}
		link="/management/{data.conferenceId}/participants?filter="
	/>
	<PlausibilityDetails
		headline={m.plausibilityIncompleteOrInvalidData()}
		items={plausibility.dataMissing}
		link="/management/{data.conferenceId}/participants?filter="
	/>
</div>
