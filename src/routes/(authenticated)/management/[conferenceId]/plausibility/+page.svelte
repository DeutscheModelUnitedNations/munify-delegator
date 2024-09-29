<script lang="ts">
	import ManagementHeader from '$lib/components/ManagementHeader.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { PageData } from './$types';
	import PlausibilityDetails from './PlausibilityDetails.svelte';
	import PlausibilityOverviewItem from './PlausibilityOverviewItem.svelte';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
</script>

<ManagementHeader title={m.adminPlausibility()} logoutUrl={data.logoutUrl} />

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
						items={data.plausibility.userFindings.tooYoungUsers}
					/>
					<PlausibilityOverviewItem
						headline={m.plausibilityTooOld()}
						items={data.plausibility.userFindings.tooOldUsers}
					/>
					<PlausibilityOverviewItem
						headline={m.plausibilityShouldBeSupervisor()}
						items={data.plausibility.userFindings.shouldBeSupervisor}
					/>
					<PlausibilityOverviewItem
						headline={m.plausibilityShouldNotBeSupervisor()}
						items={data.plausibility.userFindings.shouldNotBeSupervisor}
					/>
					<PlausibilityOverviewItem
						headline={m.plausibilityIncompleteOrInvalidData()}
						items={data.plausibility.userFindings.dataMissing}
					/>
				</tbody>
			</table>
		</div>
	</div>
	<PlausibilityDetails
		headline={m.plausibilityTooYoung()}
		items={data.plausibility.userFindings.tooYoungUsers}
		link="/management/{data.conferenceId}/participants?id="
	/>
	<PlausibilityDetails
		headline={m.plausibilityTooOld()}
		items={data.plausibility.userFindings.tooOldUsers}
		link="/management/{data.conferenceId}/participants?id="
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldBeSupervisor()}
		items={data.plausibility.userFindings.shouldBeSupervisor}
		link="/management/{data.conferenceId}/participants?id="
	/>
	<PlausibilityDetails
		headline={m.plausibilityShouldNotBeSupervisor()}
		items={data.plausibility.userFindings.shouldNotBeSupervisor}
		link="/management/{data.conferenceId}/participants?id="
	/>
	<PlausibilityDetails
		headline={m.plausibilityIncompleteOrInvalidData()}
		items={data.plausibility.userFindings.dataMissing}
		link="/management/{data.conferenceId}/participants?id="
	/>
</div>
