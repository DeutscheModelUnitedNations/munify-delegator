<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		description: string;
		icon: string;
		children: Snippet;
	}

	let { title, description, icon, children }: Props = $props();
</script>

<div class="card bg-base-100 border-base-200 border shadow-sm">
	<div class="card-body">
		<div class="flex items-start gap-4 mb-4">
			<div class="bg-primary/10 text-primary rounded-lg p-3 shrink-0 w-12 h-12 flex justify-center items-center">
				<i class="{icon} text-xl"></i>
			</div>
			<div>
				<h3 class="card-title text-lg">{title}</h3>
				<p class="text-sm text-base-content/60 mt-1">{description}</p>
			</div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
			{@render children()}
		</div>
	</div>
</div>
