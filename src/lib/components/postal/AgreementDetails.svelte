<!--
	@component
	What the person agreed to on paper in detail, box by box and line by line, as scans fill it in: one
	row of a user card list (`bg-base-200 rounded-box divide-y`).
	Folded away: the team works with the statuses, and nobody has to keep this up. A detail can be set
	by hand all the same, which no scan changes from then on.
-->
<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { client } from '#lib/api/rumbleClient/client';
	import { m } from '#lib/paraglide/messages';
	import { genericPromiseToastMessages } from '#lib/utils/toast';
	import CollapsibleRow from '#lib/components/userCard/sections/CollapsibleRow.svelte';
	import {
		AGREEMENT_FIELDS,
		AGREEMENT_GROUPS,
		type AgreementField
	} from '#lib/paperScan/agreementDetails';
	import { fieldLabel } from '#lib/paperScan/fieldLabels';
	import { agreementGroupLabel } from './agreementGroupLabels';
	import type { FieldState } from '#lib/paperScan/readPaper';
	import StateMenu from '#lib/components/userCard/ui/StateMenu.svelte';
	import { agreementStateOptions } from './agreementState';

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

<CollapsibleRow
	icon="list-checks"
	title={m.agreementDetails()}
	value={details.length > 0
		? m.agreementDetailsCount({ count: details.length, total: AGREEMENT_FIELDS.length })
		: undefined}
>
	<p class="text-base-content/70 mb-4 text-sm">{m.agreementDetailsHint()}</p>
	<div class="columns-[24rem] gap-x-12">
		{#each AGREEMENT_GROUPS as group (group.id)}
			<section class="mb-6 break-inside-avoid">
				<h4 class="mb-1 text-sm font-bold">{agreementGroupLabel[group.id]()}</h4>
				<ul>
					{#each group.fields as field (field)}
						{@const detail = detailOf(field)}
						<li class="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-x-3 py-1 text-sm">
							<span>{fieldLabel[field]()}</span>
							<span class="flex items-center gap-2 pl-2">
								<StateMenu
									name={fieldLabel[field]()}
									active={detail?.state ?? null}
									options={agreementStateOptions()}
									onSelect={(state) => change({ field, state })}
								/>
								{#if detail}
									{@const manual = detail.source === 'MANUAL'}
									{@const source = manual ? m.agreementSourceManual() : m.agreementSourceScan()}
									<span class="text-base-content/60" title={source}>
										<i
											aria-hidden="true"
											class="ph-duotone {manual ? 'ph-hand-pointing' : 'ph-scan'}"
										></i>
										<span class="sr-only">{source}</span>
									</span>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
</CollapsibleRow>
