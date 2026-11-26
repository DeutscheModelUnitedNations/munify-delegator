<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import EmailLogSection from '../sections/EmailLogSection.svelte';
	import OtherConferences from '../sections/OtherConferences.svelte';

	/** What reached the person by mail, and the other conferences they took part in. */
	interface Props {
		userId: string;
		conferenceId: string;
		/** The person has a part in this conference, so it may have written to them */
		emails: boolean;
	}

	let { userId, conferenceId, emails }: Props = $props();
</script>

<div
	class="grid grid-cols-[repeat(auto-fill,minmax(min(100%,max(34rem,(100%-3rem)/2)),1fr))] items-start gap-x-12 gap-y-6"
>
	{#if emails}
		<EmailLogSection {userId} {conferenceId} />
	{/if}
	<section class="flex min-w-0 flex-col gap-2">
		<h3 class="text-lg font-bold">{m.conferences()}</h3>
		<OtherConferences {userId} {conferenceId} />
	</section>
</div>
