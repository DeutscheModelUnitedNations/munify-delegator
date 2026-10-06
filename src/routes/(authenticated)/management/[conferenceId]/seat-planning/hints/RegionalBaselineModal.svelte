<script lang="ts">
	import { graphql } from '$houdini';
	import Modal from '$lib/components/Modal.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		translateRegionalBaseline,
		translateRegionalGroup
	} from '$lib/services/enumTranslations';
	import {
		baselineTemplates,
		isValidManualTargets,
		proportionalTargets,
		regionalBaselines,
		type BaselineCommittee,
		type RegionalBaseline
	} from '$lib/services/seatPlanning/baselines';
	import { regionalGroups } from '$lib/services/seatPlanning/unMembers';

	interface Props {
		open: boolean;
		committees: { id: string; name: string; abbreviation: string }[];
		/** the committees with their current seats and baselines */
		plannerCommittees: BaselineCommittee[];
	}

	let { open = $bindable(), committees, plannerCommittees }: Props = $props();

	const setBaselineMutation = graphql(`
		mutation SetCommitteeRegionalBaselineMutation(
			$committeeId: ID!
			$baseline: RegionalBaseline!
			$targets: [Int!]
		) {
			setCommitteeRegionalBaseline(
				committeeId: $committeeId
				baseline: $baseline
				targets: $targets
			) {
				id
				regionalBaseline
				regionalBaselineTargets
			}
		}
	`);

	let editing = $state<string>();
	let draft = $state<number[]>([]);

	const rows = $derived(
		plannerCommittees.map((committee) => ({
			...committee,
			abbreviation: committees.find((c) => c.id === committee.id)?.abbreviation ?? '',
			seats: committee.nations.length * committee.numOfSeatsPerDelegation
		}))
	);
	const current = $derived(rows.find((row) => row.id === editing));
	const draftSum = $derived(draft.reduce((sum, value) => sum + value, 0));

	const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
	const optionLabel = (baseline: RegionalBaseline) => {
		const label = translateRegionalBaseline(baseline);
		if (baseline === 'UN_MEMBERS') return m.regionalBaselineDefault({ baseline: label });
		if (baseline === 'MANUAL') return label;
		return m.regionalBaselineOptionSeats({
			baseline: label,
			seats: sum(baselineTemplates[baseline])
		});
	};
	/** the UN 193 distribution scaled to the committee, as a starting point for manual targets */
	const unProportional = (seats: number) =>
		proportionalTargets(baselineTemplates.UN_MEMBERS, seats);

	function edit(row: (typeof rows)[number]) {
		editing = row.id;
		draft = isValidManualTargets(row.regionalBaselineTargets)
			? [...row.regionalBaselineTargets]
			: unProportional(row.seats);
	}

	async function choose(row: (typeof rows)[number], baseline: RegionalBaseline) {
		edit(row);
		await setBaselineMutation.mutate({
			committeeId: row.id,
			baseline,
			// switching to manual needs targets: the stored ones, else the UN proportions
			targets: baseline === 'MANUAL' ? draft : null
		});
	}

	async function applyTargets(committeeId: string) {
		await setBaselineMutation.mutate({ committeeId, baseline: 'MANUAL', targets: draft });
	}
</script>

<Modal bind:open title={m.regionalBaselineTitle()}>
	<div class="flex flex-col gap-4">
		<p class="text-base-content/70 text-sm">{m.regionalBaselineDescription()}</p>

		<div class="border-base-300 rounded-box flex flex-col overflow-hidden border">
			{#each rows as row (row.id)}
				<div
					class="border-base-200 flex items-center gap-3 border-b px-3 py-1.5 last:border-b-0 {row.id ===
					editing
						? 'bg-base-200'
						: ''}"
				>
					<button class="flex min-h-9 items-center gap-2 text-left" onclick={() => edit(row)}>
						<span class="w-16 font-semibold">{row.abbreviation}</span>
						<span class="text-base-content/70 text-xs">{row.seats}</span>
					</button>
					<select
						class="select select-sm ml-auto w-56"
						aria-label="{m.regionalBaselineButton()} {row.abbreviation}"
						value={row.regionalBaseline}
						onchange={(e) => {
							const value = regionalBaselines.find((b) => b === e.currentTarget.value);
							if (value) choose(row, value);
						}}
					>
						{#each regionalBaselines as baseline (baseline)}
							<option value={baseline}>{optionLabel(baseline)}</option>
						{/each}
					</select>
				</div>
			{/each}
		</div>

		{#if current?.regionalBaseline === 'MANUAL'}
			<section class="bg-base-200 border-base-300 rounded-box flex flex-col gap-3 border p-4">
				<div class="flex items-center justify-between gap-2">
					<h3 class="font-semibold">
						{m.regionalBaselineManualTitle({ committee: current.abbreviation })}
					</h3>
					<span class="badge {draftSum === current.seats ? 'badge-success' : 'badge-warning'}">
						{m.regionalBaselineManualSum({ sum: draftSum, seats: current.seats })}
					</span>
				</div>
				<div class="grid grid-cols-5 gap-2">
					{#each regionalGroups as group, index (group)}
						<label class="flex flex-col gap-1 text-xs">
							<span class="truncate" title={translateRegionalGroup(group)}
								>{translateRegionalGroup(group, true)}</span
							>
							<input
								type="number"
								min="0"
								step="1"
								class="input input-sm w-full tabular-nums"
								bind:value={draft[index]}
							/>
							<span class="text-base-content/70">
								{m.regionalBaselineUnReference({
									value: (
										(baselineTemplates.UN_MEMBERS[index] / 193) *
										current.seats
									).toLocaleString(undefined, { maximumFractionDigits: 1 })
								})}
							</span>
						</label>
					{/each}
				</div>
				<p class="text-base-content/70 text-xs">{m.regionalBaselineManualHint()}</p>
				<button
					class="btn btn-primary btn-sm self-end"
					disabled={!isValidManualTargets(draft)}
					onclick={() => applyTargets(current.id)}
				>
					<i class="fa-solid fa-check"></i>
					{m.regionalBaselineApply()}
				</button>
			</section>
		{/if}
	</div>
	{#snippet action()}
		<button class="btn btn-primary" onclick={() => (open = false)}>{m.done()}</button>
	{/snippet}
</Modal>
