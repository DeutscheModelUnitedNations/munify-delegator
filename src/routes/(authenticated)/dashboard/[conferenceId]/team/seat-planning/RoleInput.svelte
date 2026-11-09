<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	/** A text column of a role; in the `draft` row of a new one, its label is the placeholder too. */
	let {
		value = $bindable(''),
		ref = $bindable(),
		label,
		draft = false,
		class: className = '',
		...rest
	}: Omit<HTMLInputAttributes, 'value' | 'type'> & {
		value?: string;
		ref?: HTMLInputElement;
		label: string;
		draft?: boolean;
	} = $props();
</script>

<input
	bind:this={ref}
	class="input input-sm w-full {className}"
	aria-label={label}
	placeholder={draft ? label : undefined}
	{value}
	oninput={(e) => (value = e.currentTarget.value)}
	{...rest}
/>
