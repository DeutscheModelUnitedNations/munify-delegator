<!-- The caller's team roles in this conference, in the top right corner of the team's card on the dashboard. -->
<script lang="ts">
	import { fetchTeamAccess } from '$lib/api/teamAccess';
	import { translateTeamRole } from '$lib/utils/enumTranslations';

	let { conferenceId }: { conferenceId: string } = $props();

	const access = $derived(await fetchTeamAccess(conferenceId));
	const roleLabels = $derived(access.roles.map((role) => translateTeamRole(role)));
</script>

{#if roleLabels.length > 0}
	<ul class="absolute top-4 right-4 flex max-w-1/2 flex-wrap justify-end gap-1.5">
		{#each roleLabels as label (label)}
			<li class="badge badge-primary badge-soft gap-1.5">
				<i class="fa-sharp-duotone fa-solid fa-user-shield text-xs" aria-hidden="true"></i>
				{label}
			</li>
		{/each}
	</ul>
{/if}
