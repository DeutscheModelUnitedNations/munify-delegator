<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="dark:stroke-slate-300 rounded-lg bg-base-100 p-4 shadow-lg dark:bg-base-200">
	<div class="overflow-x-auto">
		<table class="table">
			<tbody>
				{@render children()}
			</tbody>
		</table>
	</div>
</div>
