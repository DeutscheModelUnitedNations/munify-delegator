<script lang="ts">
	import countryCodeToLocalName from '$lib/helper/countryCodeToLocalName';
	import Flag from '$lib/components/Flag.svelte';
	import type { RoleApplication } from '@prisma/client';
	import { application } from '$lib/paraglide/messages';

	interface Props {
		roleApplications: any[];
	}

	let { roleApplications }: Props = $props();
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
				{#if application.nation}
					<td class="text-center"><Flag countryCode={application.nation.alpha2Code} size="xs" /></td
					>
					<td class="w-full">{countryCodeToLocalName(application.nation.alpha2Code, 'de')}</td>
				{:else if application.nonStateActor}
					<td class="text-center"><i class="fa-duotone fa-user"></i></td>
					<td class="w-full">{application.nonStateActor}</td>
				{/if}
				<td class="center">3</td>
			</tr>
		{/each}
	</tbody>
</table>
