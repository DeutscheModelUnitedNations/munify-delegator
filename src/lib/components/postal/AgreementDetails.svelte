<!--
	@component
	What the person agreed to on paper in detail (`AgreementDetailList`), as one row of a user card list
	(`bg-base-200 rounded-box divide-y`).
	Folded away: the team works with the statuses, and nobody has to keep this up.
-->
<script lang="ts">
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import CollapsibleRow from '#lib/components/userCard/sections/CollapsibleRow.svelte';
	import { AGREEMENT_FIELDS } from '#lib/paperScan/agreementDetails';
	import AgreementDetailList from './AgreementDetailList.svelte';

	interface Props {
		conferenceParticipantId: string;
		/** Under 18 at the conference: without, the guardians' consent says it is not needed */
		guardianNeeded?: boolean;
	}

	let { conferenceParticipantId, guardianNeeded = true }: Props = $props();

	const count = $derived(
		(
			await client.liveQuery.agreementDetails({
				__args: { where: { conferenceParticipantId: { eq: conferenceParticipantId } } },
				field: true
			})
		).length
	);
</script>

<CollapsibleRow
	icon="list-checks"
	title={m.agreementDetails()}
	value={count > 0 ? m.agreementDetailsCount({ count, total: AGREEMENT_FIELDS.length }) : undefined}
>
	<AgreementDetailList {conferenceParticipantId} {guardianNeeded} />
</CollapsibleRow>
