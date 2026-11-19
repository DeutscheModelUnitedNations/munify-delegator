<!--
	@component
	The home page's way back to the overview of the conference whose team the caller worked in
	last, as long as they are still on its team. Renders nothing otherwise, or while it is still
	finding out.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';
	import { fetchTeamAccess } from '#lib/api/teamAccess';
	import { isOnTeam } from '#lib/helpers/teamAccess';

	let { conferenceId }: { conferenceId: string } = $props();

	const [access, conference] = $derived(
		await Promise.all([
			fetchTeamAccess(conferenceId),
			client.query.conference({ __args: { id: conferenceId }, title: true })
		])
	);
</script>

{#if isOnTeam(access)}
	<a
		class="btn btn-outline btn-sm max-w-64 gap-2"
		href={resolve(`dashboard/${conferenceId}`)}
		title={m.homeTeamQuickAccess({ conference: conference.title })}
		aria-label={m.homeTeamQuickAccess({ conference: conference.title })}
	>
		<i aria-hidden="true" class="ph-duotone ph-user-gear"></i>
		<span class="truncate">{conference.title}</span>
	</a>
{/if}
