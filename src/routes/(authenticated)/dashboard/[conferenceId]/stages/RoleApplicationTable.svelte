<script lang="ts">
	import Flag from '$lib/components/Flag.svelte';
	import type { Nation } from '@prisma/client';
	import { getFullTranslatedCountryNameFromISO3Code } from '$lib/services/nationTranslationHelper.svelte';
	import getNumOfSeatsPerNation from '$lib/services/numOfSeatsPerNation';

	interface Props {
		roleApplications: any[];
		committees: any[];
	}

	let { roleApplications, committees }: Props = $props();
</script>

<table class="table">
	<thead>
		<tr>
			<th class="text-center"><i class="fa-duotone fa-hashtag"></i></th>
			<th class="text-center"><i class="fa-duotone fa-flag"></i></th>
			<th><i class="fa-duotone fa-text"></i></th>
			<th class="text-center"><i class="fa-duotone fa-users"></i></th>
		</tr>
	</thead>
	<tbody>
		{#each roleApplications as application, index}
			<tr>
				<td class="text-center">{index + 1}</td>
				{#if application?.nation}
					<td class="text-center"><Flag alpha2Code={application.nation.alpha2Code} size="xs" /></td>
					<td class="w-full"
						>{getFullTranslatedCountryNameFromISO3Code(application.nation.alpha2Code)}</td
					>
					<td class="text-center">{getNumOfSeatsPerNation(application.nation, committees)}</td>
				{:else if application?.nonStateActor}
					<td class="text-center"
						><Flag nsa size="xs" icon={application.nonStateActor.fontAwesomeIcon} /></td
					>
					<td class="w-full">{application.nonStateActor.name}</td>
					<td class="text-center">{application.nonStateActor.seatAmount}</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>
