<!--
	@component
	What the person agreed to on paper in detail, box by box and line by line, as scans fill it in.
	Folded away: the team works with the statuses, and nobody has to keep this up. A detail can be set
	by hand all the same, which no scan changes from then on.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import CollapsibleCard from '#lib/components/CollapsibleCard.svelte';
	import {
		AGREEMENT_FIELDS,
		AGREEMENT_GROUPS,
		type AgreementField
	} from '#lib/paperScan/agreementDetails';
	import { fieldLabel } from '#lib/paperScan/fieldLabels';
	import { agreementGroupLabel } from './agreementGroupLabels';
	import { agreementStateOf, selectedState } from './agreementState';

	interface Props {
		conferenceParticipantId: string;
	}

	let { conferenceParticipantId }: Props = $props();

	const details = $derived(
		await client.liveQuery.agreementDetails({
			__args: { where: { conferenceParticipantId: { eq: conferenceParticipantId } } },
			field: true,
			state: true,
			source: true
		})
	);

	const detailOf = (field: AgreementField) => details.find((detail) => detail.field === field);

	async function change({ field, value }: { field: AgreementField; value: string }) {
		const promise = Promise.resolve(
			client.mutate.setAgreementDetail({
				__args: { conferenceParticipantId, field, state: agreementStateOf(value) }
			})
		);
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
	}
</script>

<CollapsibleCard icon="list-checks" title={m.agreementDetails()}>
	{#snippet badge()}
		<span class="badge badge-ghost badge-sm">
			{m.agreementDetailsCount({ count: details.length, total: AGREEMENT_FIELDS.length })}
		</span>
	{/snippet}
	<p class="text-base-content/70 mb-3 text-sm">{m.agreementDetailsHint()}</p>
	<div class="flex flex-col gap-4">
		{#each AGREEMENT_GROUPS as group (group.id)}
			<section class="flex flex-col gap-1">
				<h4 class="text-sm font-semibold">{agreementGroupLabel[group.id]()}</h4>
				<ul class="divide-base-300 flex flex-col divide-y">
					{#each group.fields as field (field)}
						{@const detail = detailOf(field)}
						<li>
							<label
								class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-sm"
							>
								<span class="min-w-40 grow">{fieldLabel[field]()}</span>
								<span class="flex items-center gap-2">
									{#if detail}
										<span class="text-base-content/60 text-xs">
											{detail.source === 'MANUAL'
												? m.agreementSourceManual()
												: m.agreementSourceScan()}
										</span>
									{/if}
									<select
										class="select select-xs w-32"
										value={selectedState(detail?.state)}
										onchange={(event) => change({ field, value: event.currentTarget.value })}
									>
										<option value="">{m.agreementStateUnknown()}</option>
										<option value="yes">{m.agreementStateYes()}</option>
										<option value="no">{m.agreementStateNo()}</option>
										<option value="unclear">{m.agreementStateUnclear()}</option>
									</select>
								</span>
							</label>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
</CollapsibleCard>
