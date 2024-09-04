<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="bg-base-100 dark:bg-base-200 shadow-lg rounded-lg p-4 dark:stroke-slate-300">
	<div class="overflow-x-auto">
		<table class="table">
			<tbody>
				{@render children()}
			</tbody>
		</table>
	</div>
</div>
