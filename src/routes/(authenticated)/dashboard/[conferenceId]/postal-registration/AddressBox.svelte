<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { client } from '#lib/api/rumbleClient/client';

	/** Where the documents go. */
	interface Props {
		conferenceId: string;
		/** What is said above the address, as HTML (`postalRegistrationTexts`). */
		whereTo: string;
	}

	let { conferenceId, whereTo }: Props = $props();

	const conference = $derived(
		await client.liveQuery.conference({
			__args: { id: conferenceId },
			postalName: true,
			postalStreet: true,
			postalApartment: true,
			postalZip: true,
			postalCity: true,
			postalCountry: true
		})
	);
</script>

<div class="flex flex-col gap-4">
	<div class="prose prose-sm">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		{@html whereTo}
	</div>
	<div class="bg-base-200 flex gap-6 rounded-box p-4">
		<i aria-hidden="true" class="ph-duotone ph-mailbox text-4xl"></i>
		<address class="text-lg not-italic">
			<strong>{conference.postalName}</strong><br /><span>{conference.postalStreet}</span><br />
			{#if conference.postalApartment}
				<span>{conference.postalApartment}</span><br />
			{/if}
			<span>{conference.postalZip} {conference.postalCity}</span><br />
			<span>{conference.postalCountry}</span>
		</address>
	</div>
	<div class="prose prose-sm">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted: translation strings authored in messages/ -->
		{@html m.postalRegistrationFAQ2()}
	</div>
</div>
