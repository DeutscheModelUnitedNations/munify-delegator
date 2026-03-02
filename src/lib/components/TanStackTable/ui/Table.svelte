<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLTableAttributes } from 'svelte/elements';

	interface Props extends HTMLTableAttributes {
		children: Snippet;
	}

	let { children, class: className = '', ...rest }: Props = $props();
</script>

<div class="max-h-[80vh] overflow-auto">
	<table class="table table-pin-rows {className}" {...rest}>
		{@render children()}
	</table>
</div>
