<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import { DATE_BUCKETS, type GroupBy } from '#lib/dataGrid/stateSchema';
	import { dateBucketOf } from '#lib/dataGrid/grouping';
	import type { GridColumn } from '../gridColumn';
	import ColumnSelect from '../filter/ColumnSelect.svelte';
	import { DATE_BUCKET_LABELS } from '../labels';

	/** One level of grouping: the column, and for dates the span, for numbers the range width. */
	interface Props {
		level: number;
		groupBy: GroupBy;
		columns: readonly GridColumn<Row>[];
		onchange: (groupBy: GroupBy) => void;
		onremove: () => void;
	}

	let { level, groupBy, columns, onchange, onremove }: Props = $props();

	const column = $derived(columns.find((candidate) => candidate.id === groupBy.column));
</script>

<div class="flex flex-wrap items-center gap-2">
	<span class="text-base-content/60 w-6 text-sm tabular-nums">{level + 1}.</span>
	<div class="min-w-40 grow">
		<ColumnSelect
			{columns}
			value={groupBy.column}
			label={m.dataGridGroupByColumn()}
			onchange={(next) => onchange({ column: next.id })}
		/>
	</div>
	{#if column?.type === 'date'}
		<select
			class="select select-bordered select-sm"
			aria-label={m.dataGridGroupBucket()}
			value={dateBucketOf(groupBy)}
			onchange={(event) => {
				const bucket = DATE_BUCKETS.find((candidate) => candidate === event.currentTarget.value);
				onchange({ column: groupBy.column, bucket });
			}}
		>
			{#each DATE_BUCKETS as bucket (bucket)}
				<option value={bucket}>{DATE_BUCKET_LABELS[bucket]()}</option>
			{/each}
		</select>
	{:else if column?.type === 'number'}
		<label class="flex items-center gap-2 text-sm">
			<span class="text-base-content/70">{m.dataGridGroupStep()}</span>
			<input
				type="number"
				min="1"
				class="input input-bordered input-sm w-20"
				value={groupBy.step ?? ''}
				placeholder="–"
				onchange={(event) => {
					const step = Math.floor(Number(event.currentTarget.value));
					onchange({ column: groupBy.column, ...(step >= 1 ? { step } : {}) });
				}}
			/>
		</label>
	{/if}
	<button
		class="btn btn-ghost btn-sm btn-square"
		aria-label={m.dataGridRemoveGrouping()}
		onclick={onremove}
	>
		<i class="ph-duotone ph-x"></i>
	</button>
</div>
