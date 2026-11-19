<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages';
	import { getConferenceMenu } from '#lib/state/conferenceMenu.svelte.js';

	/**
	 * The way back from a participant page to the conference's dashboard; first thing on every one.
	 * Left out beside the conference's side navigation, whose overview entry already is that way.
	 */
	let { conferenceId }: { conferenceId: string } = $props();

	const menu = getConferenceMenu();
</script>

{#if !menu.shown}
	<a href={resolve(`dashboard/${conferenceId}`)} class="btn btn-ghost btn-sm gap-2 self-start">
		<i aria-hidden="true" class="ph-duotone ph-arrow-left"></i>
		{m.backToDashboard()}
	</a>
{/if}
