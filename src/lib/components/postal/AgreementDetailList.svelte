<!--
	@component
	What the person agreed to on paper in detail, box by box and line by line, as scans fill it in, its
	groups in as many columns as fit. A detail can be set by hand all the same, which no scan changes
	from then on.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import { AGREEMENT_GROUPS, type AgreementField } from '#lib/paperScan/agreementDetails';
	import { agreementGroupLabel } from './agreementGroupLabels';
	import type { FieldState } from '#lib/paperScan/readPaper';
	import AgreementDetailRow from './AgreementDetailRow.svelte';

	interface Props {
		conferenceParticipantId: string;
		/** Under 18 at the conference: without, the guardians' consent says it is not needed */
		guardianNeeded?: boolean;
	}

	let { conferenceParticipantId, guardianNeeded = true }: Props = $props();

	const details = $derived(
		await client.liveQuery.agreementDetails({
			__args: { where: { conferenceParticipantId: { eq: conferenceParticipantId } } },
			field: true,
			state: true,
			source: true
		})
	);

	const detailOf = (field: AgreementField) => details.find((detail) => detail.field === field);

	async function change({ field, state }: { field: AgreementField; state: FieldState | null }) {
		const promise = Promise.resolve(
			client.mutate.setAgreementDetail({
				__args: { conferenceParticipantId, field, state }
			})
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}
</script>

<p class="text-base-content/70 mb-4 text-sm">{m.agreementDetailsHint()}</p>
<div class="columns-sm gap-x-12">
	{#each AGREEMENT_GROUPS as group (group.id)}
		<section class="mb-6 break-inside-avoid">
			<h4 class="mb-1 text-sm font-bold">{agreementGroupLabel[group.id]()}</h4>
			{#if group.id === 'guardianConsent' && !guardianNeeded}
				<p role="note" class="alert alert-info alert-soft my-2 px-3 py-2 text-xs">
					<i aria-hidden="true" class="ph-duotone ph-info text-base"></i>
					{m.agreementGuardianNotNeeded()}
				</p>
			{/if}
			<ul>
				{#each group.fields as field (field)}
					<AgreementDetailRow
						{field}
						detail={detailOf(field)}
						onChange={(state) => change({ field, state })}
					/>
				{/each}
			</ul>
		</section>
	{/each}
</div>
