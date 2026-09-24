<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children?: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<fieldset class="fieldset bg-base-100 border-base-300 rounded-box w-full max-w-xl border p-4">
	<legend class="fieldset-legend">{title}</legend>
	{@render children?.()}
</fieldset>
