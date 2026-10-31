<script lang="ts">
	import { m } from '#lib/paraglide/messages';
	import type { HTMLInputAttributes } from 'svelte/elements';

	/** A role's number of seats; `min` defaults to one. */
	let {
		value = $bindable(1),
		class: className = '',
		min = 1,
		...rest
	}: Omit<HTMLInputAttributes, 'value' | 'type'> & { value?: number } = $props();
</script>

<input
	type="number"
	class="input input-sm w-16 {className}"
	aria-label={m.seats()}
	{min}
	{value}
	oninput={(e) => (value = e.currentTarget.valueAsNumber)}
	{...rest}
/>
