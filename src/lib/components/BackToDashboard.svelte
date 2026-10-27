<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';

	/** The way back from a participant page to the conference's dashboard; first thing on every one. */
	let { conferenceId }: { conferenceId: string } = $props();
</script>

<a href={resolve(`dashboard/${conferenceId}`)} class="btn btn-ghost btn-sm gap-2 self-start">
	<i class="fa-sharp-duotone fa-solid fa-arrow-left"></i>
	{m.backToDashboard()}
</a>
