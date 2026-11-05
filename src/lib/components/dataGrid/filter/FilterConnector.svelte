<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { Connective } from '#lib/dataGrid/stateSchema';

	/** "and" / "or" between the items of a level; a click switches the whole level. */
	interface Props {
		op: Connective;
		onchange: (op: Connective) => void;
	}

	let { op, onchange }: Props = $props();
</script>

<div class="flex items-center gap-2 py-1">
	<button
		class="btn btn-xs {op === 'and' ? 'btn-info' : 'btn-warning'} min-w-14"
		title={m.dataGridSwitchConnective()}
		onclick={() => onchange(op === 'and' ? 'or' : 'and')}
	>
		{op === 'and' ? m.dataGridAnd() : m.dataGridOr()}
	</button>
	<div class="border-base-300 grow border-t"></div>
</div>
