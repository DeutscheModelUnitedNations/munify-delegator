<script lang="ts" generics="Row">
	import { m } from '#lib/paraglide/messages';
	import type { GridColumn } from '../gridColumn';

	/** One column in the column panel: shown or not, and moved among the shown ones. */
	interface Props {
		column: GridColumn<Row>;
		visible: boolean;
		canMoveUp: boolean;
		canMoveDown: boolean;
		ontoggle: (visible: boolean) => void;
		onmove: (delta: -1 | 1) => void;
	}

	let { column, visible, canMoveUp, canMoveDown, ontoggle, onmove }: Props = $props();
</script>

<li class="flex items-center gap-2 py-1">
	<label class="flex grow cursor-pointer items-center gap-3">
		<input
			type="checkbox"
			class="checkbox checkbox-sm"
			checked={visible}
			disabled={column.alwaysVisible}
			onchange={(event) => ontoggle(event.currentTarget.checked)}
		/>
		<span class="flex flex-col">
			<span>{column.label}</span>
			{#if column.description}
				<span class="text-base-content/60 text-xs">{column.description}</span>
			{/if}
		</span>
	</label>
	{#if visible && !column.alwaysVisible}
		<div class="join">
			<button
				class="join-item btn btn-ghost btn-xs"
				aria-label={m.dataGridMoveLeft({ column: column.label })}
				disabled={!canMoveUp}
				onclick={() => onmove(-1)}
			>
				<i class="fa-sharp-duotone fa-solid fa-arrow-up"></i>
			</button>
			<button
				class="join-item btn btn-ghost btn-xs"
				aria-label={m.dataGridMoveRight({ column: column.label })}
				disabled={!canMoveDown}
				onclick={() => onmove(1)}
			>
				<i class="fa-sharp-duotone fa-solid fa-arrow-down"></i>
			</button>
		</div>
	{/if}
</li>
