<!--
	@component
	The home page's way back into the team area of the conference the caller opened last, as long
	as they are still on its team. Renders nothing otherwise, or while it is still finding out.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { firstTeamPagePath } from '#lib/data/teamRoutes';

	let { conferenceId }: { conferenceId: string } = $props();

	const [access, conference] = $derived(
		await Promise.all([
			fetchTeamAccess(conferenceId),
			client.query.conference({ __args: { id: conferenceId }, title: true })
		])
	);
	const firstPage = $derived(firstTeamPagePath(access));
</script>

{#if firstPage}
	<a
		class="btn btn-outline btn-sm max-w-64 gap-2"
		href={resolve(`dashboard/${conferenceId}/${firstPage}`)}
		title={m.homeTeamQuickAccess({ conference: conference.title })}
		aria-label={m.homeTeamQuickAccess({ conference: conference.title })}
	>
		<i class="ph-duotone ph-user-gear"></i>
		<span class="truncate">{conference.title}</span>
	</a>
{/if}
