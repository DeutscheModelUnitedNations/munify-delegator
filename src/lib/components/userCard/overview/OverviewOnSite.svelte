<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import AccessRows from '../sections/AccessRows.svelte';

	/** Letting the person in: whether they are there, and their access card. */
	interface Props {
		userId: string;
		conferenceId: string;
	}

	let { userId, conferenceId }: Props = $props();
</script>

<section class="bg-base-200 rounded-box flex flex-col gap-1 py-3">
	<h3 class="px-4 font-bold">{m.userCardTabOnSite()}</h3>
	<AccessRows {userId} {conferenceId} />
</section>
