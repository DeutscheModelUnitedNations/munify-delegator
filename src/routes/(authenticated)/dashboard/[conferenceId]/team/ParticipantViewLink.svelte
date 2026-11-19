<!--
	@component
	The way from a team page to the participants' view of what it edits (`participantViewOf`), so
	the team sees what participants get without a page of their own for it in the menu.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import { participantViewOf } from '#lib/data/teamRoutes';
	import { m } from '#lib/paraglide/messages';

	let { conferenceId, of }: { conferenceId: string; of: keyof typeof participantViewOf } = $props();
</script>

<a
	class="btn btn-ghost btn-sm gap-2"
	href={resolve(`dashboard/${conferenceId}/${participantViewOf[of]}`)}
	data-testid="participant-view-link"
>
	<i aria-hidden="true" class="ph-duotone ph-eye"></i>
	{m.participantView()}
</a>
