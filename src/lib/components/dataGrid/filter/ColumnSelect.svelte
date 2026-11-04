<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import { columnGroups, type GridColumn } from '../gridColumn';

	/** A column, picked from the columns by their headings. */
	interface Props {
		columns: readonly GridColumn<Row>[];
		value: string | undefined;
		label: string;
		onchange: (column: GridColumn<Row>) => void;
		placeholder?: string;
	}

	let { columns, value, label, onchange, placeholder }: Props = $props();

	const groups = $derived(columnGroups({ columns, fallback: m.dataGridOtherColumns() }));
</script>

<select
	class="select select-bordered select-sm w-full"
	aria-label={label}
	value={value ?? ''}
	onchange={(event) => {
		const column = columns.find((candidate) => candidate.id === event.currentTarget.value);
		if (column) onchange(column);
	}}
>
	{#if placeholder}
		<option value="" disabled>{placeholder}</option>
	{/if}
	{#each groups as group (group.title)}
		<optgroup label={group.title}>
			{#each group.columns as column (column.id)}
				<option value={column.id}>{column.label}</option>
			{/each}
		</optgroup>
	{/each}
</select>
