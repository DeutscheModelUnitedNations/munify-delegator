<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		children: Snippet;
	}

	let { title, children }: Props = $props();
</script>

<div class="collapse-arrow bg-base-100 collapse">
	<input type="checkbox" />
	<div class="text-md collapse-title font-medium">{title}</div>
	<div class="collapse-content flex flex-col gap-4">
		{@render children()}
	</div>
</div>
