<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import { markPostalGuidePassed } from '#lib/state/postalGuide.svelte.js';
	import { downloadPostalRegistration } from '#lib/api/postalRegistrationPdf';
	import PersonalDetails from './PersonalDetails.svelte';
	import type { PostalDetails } from './postalDetails';

	/** The documents to download, for the person as they confirmed their details. */
	interface Props {
		userId: string;
		conferenceId: string;
		details: PostalDetails;
		/** What a minor has to look out for. */
		warning?: string;
	}

	let { userId, conferenceId, details, warning }: Props = $props();

	let loading = $state(false);

	async function download() {
		// the hints came before, perhaps another day
		markPostalGuidePassed();
		try {
			await downloadPostalRegistration({
				userId,
				conferenceId,
				onStart: () => (loading = true)
			});
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<PersonalDetails {details} />

	{#if warning}
		<div class="alert alert-warning">
			<i aria-hidden="true" class="ph-fill ph-warning text-2xl"></i>
			<span>{warning}</span>
		</div>
	{/if}

	<button type="button" class="btn btn-primary btn-lg" onclick={download} disabled={loading}>
		{#if loading}
			<i aria-hidden="true" class="ph-fill ph-spinner-gap animate-spin"></i>
			{m.documentsAreBeingPrepared()}
		{:else}
			<i aria-hidden="true" class="ph-fill ph-download-simple"></i>
			{m.downloadDocuments()}
		{/if}
	</button>
</div>
