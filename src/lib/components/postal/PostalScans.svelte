<!--
	@component
	The scanned pages kept of the person's application documents, as a row of a user card list
	(`bg-base-200 rounded-box divide-y`): how many there are, with the upload, and folded below it the
	scans (`PostalScanList`).
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import CollapsibleRow from '#lib/components/userCard/sections/CollapsibleRow.svelte';
	import UploadScanButton from './UploadScanButton.svelte';
	import PostalScanList from './PostalScanList.svelte';

	interface Props {
		conferenceId: string;
		userId: string;
		conferenceParticipantId: string;
		/** Lists the scans right away */
		unfolded?: boolean;
	}

	let { conferenceId, userId, conferenceParticipantId, unfolded = false }: Props = $props();

	const count = $derived(
		(
			await client.liveQuery.postalScans({
				__args: { where: { conferenceParticipantId: { eq: conferenceParticipantId } } },
				fields: true
			})
		).length
	);
</script>

<CollapsibleRow
	title={m.postalScansRow()}
	icon="scan"
	value={count > 0 ? m.postalScansCount({ count }) : undefined}
	{unfolded}
	children={count > 0 ? list : undefined}
>
	{#snippet actions()}
		<UploadScanButton {conferenceId} {userId} />
	{/snippet}
</CollapsibleRow>

{#snippet list()}
	<PostalScanList {conferenceParticipantId} />
{/snippet}
