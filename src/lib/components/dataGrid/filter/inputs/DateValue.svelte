<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		value: unknown;
		onchange: (value: string | null) => void;
		label?: string;
	}

	let { value, onchange, label = m.dataGridValue() }: Props = $props();
</script>

<input
	type="date"
	class="input input-bordered input-sm w-full"
	aria-label={label}
	value={typeof value === 'string' ? value : ''}
	onchange={(event) => onchange(event.currentTarget.value || null)}
/>
