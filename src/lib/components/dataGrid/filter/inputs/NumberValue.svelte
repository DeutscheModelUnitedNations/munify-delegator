<script lang="ts">
	import { m } from '#lib/paraglide/messages';

	interface Props {
		value: unknown;
		onchange: (value: number | null) => void;
		placeholder?: string;
	}

	let { value, onchange, placeholder = m.dataGridValue() }: Props = $props();

	const parse = (text: string) => (text.trim() === '' ? null : Number(text));
</script>

<input
	type="number"
	class="input input-bordered input-sm w-full"
	{placeholder}
	aria-label={placeholder}
	value={typeof value === 'number' ? value : ''}
	onchange={(event) => onchange(parse(event.currentTarget.value))}
/>
