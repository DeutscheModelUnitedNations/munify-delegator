<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLTableAttributes } from 'svelte/elements';
	import { getTableSettings } from '../toolbar/tableSettings.svelte';

	interface Props extends HTMLTableAttributes {
		children: Snippet;
		/** Classes of the scroll container, which decides how tall the table may grow. */
		wrapperClass?: string;
	}

	let {
		children,
		class: className = '',
		wrapperClass = 'max-h-[80vh] w-full',
		...rest
	}: Props = $props();

	const { getTableSize, getZebra } = getTableSettings();
</script>

<div class="overflow-auto {wrapperClass}">
	<table
		class="table table-pin-rows table-{getTableSize()} {getZebra()
			? 'table-zebra'
			: ''} {className}"
		{...rest}
	>
		{@render children()}
	</table>
</div>
